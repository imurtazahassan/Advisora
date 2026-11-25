import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AdvisoryController } from './advisory.controller';
import { AdvisoryService } from './advisory.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AdvisoryController],
  providers: [AdvisoryService],
})
export class AdvisoryModule {}
