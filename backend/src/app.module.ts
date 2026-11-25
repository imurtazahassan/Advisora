import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { MarketDataModule } from './market_ingestion/market-data.module';
import { AdvisoryModule } from './advisories/advisory.module';
import { PlansModule } from './plans/plans.module';
import { ExecutionModule } from './execution/execution.module';
import { SupportingModule } from './supporting/supporting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    MarketDataModule,
    AdvisoryModule,
    PlansModule,
    ExecutionModule,
    SupportingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
