import type { HistoryPoint, Quote, StockSearchResult } from '@/lib/types';

const stocks: Array<StockSearchResult & { price: number; change: number; previousClose: number }> = [
  { symbol: 'AAPL', name: 'Apple Inc.', region: 'United States', exchange: 'NASDAQ', type: 'Equity', matchScore: 1, price: 213.07, change: 1.48, previousClose: 211.59 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', region: 'United States', exchange: 'NASDAQ', type: 'Equity', matchScore: 1, price: 428.76, change: -2.31, previousClose: 431.07 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', region: 'United States', exchange: 'NASDAQ', type: 'Equity', matchScore: 1, price: 141.98, change: 3.24, previousClose: 138.74 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', region: 'United States', exchange: 'NASDAQ', type: 'Equity', matchScore: 1, price: 176.21, change: 0.63, previousClose: 175.58 },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', region: 'United States', exchange: 'NASDAQ', type: 'Equity', matchScore: 1, price: 187.54, change: -0.84, previousClose: 188.38 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', region: 'United States', exchange: 'NYSE', type: 'Equity', matchScore: 1, price: 201.16, change: 1.03, previousClose: 200.13 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', region: 'United States', exchange: 'NASDAQ', type: 'Equity', matchScore: 1, price: 248.5, change: -4.12, previousClose: 252.62 },
];

export function searchMockStocks(query: string): StockSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return stocks.filter((stock) => stock.symbol.toLowerCase().includes(normalized) || stock.name.toLowerCase().includes(normalized)).slice(0, 8);
}

export function getMockQuote(symbol: string): Quote | null {
  const stock = stocks.find((item) => item.symbol === symbol);
  if (!stock) return null;
  return {
    symbol: stock.symbol,
    price: stock.price,
    change: stock.change,
    changePercent: (stock.change / stock.previousClose) * 100,
    previousClose: stock.previousClose,
    latestTradingDay: '2025-01-17',
    currency: 'USD',
  };
}

export function getMockHistory(symbol: string): HistoryPoint[] {
  const quote = getMockQuote(symbol);
  if (!quote) return [];
  const points: HistoryPoint[] = [];
  const end = new Date('2025-01-17T12:00:00Z');
  for (let i = 89; i >= 0; i -= 1) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - i);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
    const wave = Math.sin(i * 0.17 + symbol.length) * 0.018 + Math.cos(i * 0.053) * 0.012;
    const trend = 1 - i * 0.00072;
    points.push({ date: date.toISOString().slice(0, 10), close: Math.max(0.01, quote.price * trend * (1 + wave)) });
  }
  if (points.length) points[points.length - 1].close = quote.price;
  return points;
}
