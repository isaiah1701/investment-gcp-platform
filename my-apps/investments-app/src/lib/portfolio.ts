import type { Holding, PortfolioSummary, Quote } from './types';

export function calculatePortfolio(holdings: Holding[], quotes: Record<string, Quote | undefined>): PortfolioSummary {
  const valued = holdings.map((holding) => {
    const costBasis = holding.quantity * holding.averagePrice;
    const quote = quotes[holding.symbol];
    const price = quote && Number.isFinite(quote.price) && quote.price >= 0 ? quote.price : null;
    const currentValue = price === null ? 0 : holding.quantity * price;
    const unrealizedPnl = price === null ? 0 : currentValue - costBasis;
    return {
      ...holding,
      price,
      costBasis,
      currentValue,
      unrealizedPnl,
      unrealizedPnlPercent: price === null || costBasis <= 0 ? 0 : (unrealizedPnl / costBasis) * 100,
    };
  });
  const totalInvested = valued.reduce((total, item) => total + item.costBasis, 0);
  const priced = valued.filter((item) => item.price !== null);
  const totalValue = priced.reduce((total, item) => total + item.currentValue, 0);
  const pricedCostBasis = priced.reduce((total, item) => total + item.costBasis, 0);
  const unrealizedPnl = priced.reduce((total, item) => total + item.unrealizedPnl, 0);
  return {
    holdings: valued,
    totalInvested,
    totalValue,
    unrealizedPnl,
    unrealizedPnlPercent: pricedCostBasis > 0 ? (unrealizedPnl / pricedCostBasis) * 100 : 0,
  };
}

export function validateHolding(quantity: number, averagePrice: number): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000_000) return 'Enter a quantity greater than zero.';
  if (!Number.isFinite(averagePrice) || averagePrice <= 0 || averagePrice > 1_000_000_000) return 'Enter an average price greater than zero.';
  return null;
}
