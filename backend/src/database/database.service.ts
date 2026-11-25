import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async onModuleInit() {
    try {
      await this.pool.query('SELECT 1');
      console.log('Database layer ready.');
    } catch (err) {
      console.warn('Database not connected — some features may not work:', err instanceof Error ? err.message : err);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
