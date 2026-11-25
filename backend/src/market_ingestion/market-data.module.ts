import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { MARKET_DATA_PROVIDER } from './market-data.provider';
import { SimulatedMarketDataProvider } from './simulated-market-data.provider';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MarketDataController],
  providers: [
    MarketDataService,
    SimulatedMarketDataProvider,
    { provide: MARKET_DATA_PROVIDER, useExisting: SimulatedMarketDataProvider },
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
