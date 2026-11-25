import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MarketDataService } from './market-data.service';

@Controller('market-data')
@UseGuards(AuthGuard)
export class MarketDataController {
  constructor(private readonly marketData: MarketDataService) {}

  @Get()
  getMarketData() { return this.marketData.getStatus(); }

  @Post('refresh')
  refresh() { return this.marketData.refresh(); }
}
