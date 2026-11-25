import { Injectable } from '@nestjs/common';
import { MarketDataProvider, MarketTick } from './market-data.provider';

/** Deterministic demo feed; values are fictional and must never be represented as live prices. */
@Injectable()
export class SimulatedMarketDataProvider implements MarketDataProvider {
  readonly source = 'SIMULATED' as const;

  async getLatestTicks(): Promise<MarketTick[]> {
    const eventTime = new Date();
    return [
      { symbol: 'BTC/USDT', price: 67500, eventTime },
      { symbol: 'ETH/USDT', price: 3450, eventTime },
    ];
  }
}
