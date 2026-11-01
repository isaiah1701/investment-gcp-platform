export type DataMode = 'mock' | 'live';

export type StockSearchResult = {
  symbol: string;
  name: string;
  region: string;
  exchange: string;
  type: string;
  matchScore: number;
};

export type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  latestTradingDay: string;
  currency: 'USD';
};

export type HistoryPoint = { date: string; close: number };

export type MarketEnvelope<T> = {
  data: T;
  mode: DataMode;
  fetchedAt: string;
  stale: boolean;
};

export type Holding = {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
};

export type HoldingValuation = Holding & {
  costBasis: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  price: number | null;
};

export type PortfolioSummary = {
  holdings: HoldingValuation[];
  totalInvested: number;
  totalValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
};
