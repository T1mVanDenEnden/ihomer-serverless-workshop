import {CoinOrder, Currency} from '../models/currency.model';
import axios from 'axios';

const BASE_URL =
    'https://lvm584y1bf.execute-api.eu-central-1.amazonaws.com/prod/api';

// Insert unique ID
const { UNIQUE_ID } = process.env;

axios.interceptors.request.use(
    async (config) => {
        config.headers['wallet'] = UNIQUE_ID;
        return config;
    },
    function (error) {
        return Promise.reject(error);
    }
);

export class CryptoService {
    static async getCoins(): Promise<Currency[]> {
        try {
            return (await axios.get(BASE_URL + '/coins')).data;
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    static async buyCoin(coinOrder: CoinOrder): Promise<{ message: string, cost: number }> {
        try {
            return (
                await axios.post(BASE_URL + '/coins/buy', coinOrder)
            ).data;
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    static async sellCoin(coinOrder: CoinOrder): Promise<{ message: string, amount: number, price: number, walletFiat: number }> {
        try {
            return (
                await axios.post(BASE_URL + '/coins/sell', coinOrder)
            ).data;
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    static async depositBalance(amount: number): Promise<{ message: string }> {
        try {
            return (
                await axios.put(BASE_URL + '/fiat/deposit', {
                    amount,
                })
            ).data;
        } catch (e) {
            console.log(e);
            throw e;
        }
    }
}
