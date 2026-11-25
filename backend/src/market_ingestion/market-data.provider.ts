export interface MarketTick {
  symbol: string;
  price: number;
  eventTime: Date;
}

/** Inbound adapter contract. Production exchange providers are deliberately not configured. */
export interface MarketDataProvider {
  readonly source: 'SIMULATED' | 'TEST_FIXTURE';
  getLatestTicks(): Promise<MarketTick[]>;
}

export const MARKET_DATA_PROVIDER = 'MARKET_DATA_PROVIDER';
