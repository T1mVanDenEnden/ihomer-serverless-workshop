import create, { State } from 'zustand';
import { OwnedCryptoCoin } from '../models/Currency';
import { PortfolioService } from '../services/portfolio.service';

interface FiatState extends State {
    portfolio: OwnedCryptoCoin[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

// Initial fetch
PortfolioService.getPortfolio()
    .then((portfolio: OwnedCryptoCoin[]) => {
        usePortfolioStore.setState({
            portfolio,
            isLoading: false,
            error: null,
        });
    })
    .catch(() => {
        usePortfolioStore.setState({
            portfolio: [],
            isLoading: false,
            error: 'Oops something went wrong',
        });
    });

export const usePortfolioStore = create<FiatState>((set, get) => ({
    portfolio: [],
    isLoading: true,
    error: null,
    refresh: async () => {
        set(() => ({ isLoading: true, error: null }));

        try {
            const portfolio = await PortfolioService.getPortfolio();
            set(() => ({ portfolio: portfolio, error: null }));
        } catch (e) {
            set(() => ({ portfolio: [], error: 'Oops something went wrong' }));
        }

        set(() => ({ isLoading: false }));
    },
}));
