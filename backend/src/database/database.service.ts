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
    await this.pool.query('SELECT 1');
    console.log('PostgreSQL connection successful.');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
