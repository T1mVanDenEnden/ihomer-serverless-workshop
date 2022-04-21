import { CryptoService } from '../services/crypto.service';
import { getWalletClient } from "../util/dynamo";

// event, context, callback
export const handler = async (event) => {

    const { amount } = JSON.parse(event.body);

    if (amount < 0 || amount > 100) {
        return {
            statusCode: 400,
            body: JSON.stringify( {
                message: "Bad request"
            })
        }
    }

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
    const newAmount: number = walletAmount + amount;

    await walletClient
        .update({
            TableName: DYNAMO_TABLE,
            Key: {
                pk: UNIQUE_ID,
            },
            UpdateExpression: 'SET fiat = :amount',
            ExpressionAttributeValues: {
                ':amount': newAmount,
            },
        })
        .promise();

    await CryptoService.depositBalance(amount);

    return {
        statusCode: 200,
        body: JSON.stringify( {
            balance: newAmount
        })
    }
};
