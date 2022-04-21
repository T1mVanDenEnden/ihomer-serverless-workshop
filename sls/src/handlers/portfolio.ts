import { getWalletClient } from "../util/dynamo";

export const handler = async (event) => {

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
    let coins = wallet?.coins || {};
    let coinsAsArray = [];

    for (const key in coins) {  // const k: string
        coinsAsArray.push({
            id: key,
            amount: coins[key]
        })
    }

    return {
        statusCode: 200,
        body: JSON.stringify(coinsAsArray)
    }
};
