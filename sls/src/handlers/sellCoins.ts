import { getWalletClient } from "../util/dynamo";
import { CryptoService } from '../services/crypto.service';

export const handler = async (event) => {

    const { coinId, amount } = JSON.parse(event.body);

    // Get wallet amount
    const {DYNAMO_TABLE = '', UNIQUE_ID = ''} = process.env;
    const walletClient = getWalletClient();

    const result = await walletClient
        .get({
            TableName: DYNAMO_TABLE,
            Key: {
                pk: UNIQUE_ID,
            },
        })
        .promise();

    const wallet = result.Item;
    const walletAmount = wallet?.fiat || 0;

    // Sell coins
    const sellResult = await CryptoService.sellCoin({ coinId, amount });

    // Update the client wallet
    const coinAmount = wallet?.coins[coinId] || 0;

    const newWalletAmount: number = sellResult.walletFiat;
    const newCoinAmount: number = coinAmount - amount;

    await walletClient
        .update({
            TableName: DYNAMO_TABLE,
            Key: {
                pk: UNIQUE_ID,
            },
            UpdateExpression: 'SET fiat = :walletAmount, coins.' + coinId + ' = :coinAmount',
            ExpressionAttributeValues: {
                ':walletAmount': newWalletAmount,
                ':coinAmount': newCoinAmount
            },
        })
        .promise();

    return {
        statusCode: 200,
        body: JSON.stringify(sellResult)
    }
};
