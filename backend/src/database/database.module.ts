import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';
import { createInMemoryPgPool } from './in-memory-pg';

export const PG_POOL = 'PG_POOL';

function isLocalConnectionRefusedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: unknown; errors?: unknown[] };
  if (typeof record.code === 'string') {
    if (record.code === 'ECONNREFUSED') return true;
    // Any PostgreSQL SQLSTATE (e.g., 28P01 bad password, 3D000 missing DB) must fail loudly
    return false;
  }
  if (Array.isArray(record.errors)) {
    return record.errors.some((nested) => isLocalConnectionRefusedError(nested));
  }
  return false;
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const nodeEnv = (config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development')
          .trim()
          .toLowerCase();
        const isDevOrTest = nodeEnv === 'development' || nodeEnv === 'test';
        const useInMemory = config.get<string>('USE_IN_MEMORY_DB')?.trim().toLowerCase();

        if (useInMemory === 'true') {
          if (!isDevOrTest) {
            throw new Error(
              'USE_IN_MEMORY_DB=true is forbidden outside development/test mode. PostgreSQL is required under ADR-003.',
            );
          }
          console.warn(
            '[DEV/DEMO ONLY] USE_IN_MEMORY_DB=true — using non-persistent in-memory PostgreSQL adapter',
          );
          return createInMemoryPgPool();
        }

        const host = config.get<string>('DB_HOST')?.trim();
        const port = Number(config.get<string>('DB_PORT', '5432'));
        const user = config.get<string>('DB_USER')?.trim();
        const password = config.get<string>('DB_PASSWORD');
        const database = config.get<string>('DB_NAME')?.trim();

        if (!host) {
          if (!isDevOrTest || useInMemory === 'false') {
            throw new Error(
              'DB_HOST must be configured. PostgreSQL is the authoritative persistent database under ADR-003.',
            );
          }
          console.warn(
            '[DEV/DEMO ONLY] DB_HOST not configured — using non-persistent in-memory PostgreSQL adapter',
          );
          return createInMemoryPgPool();
        }

        const pool = new Pool({
          host,
          port,
          user,
          password,
          database,
          connectionTimeoutMillis: !isDevOrTest ? 5000 : 1500,
        });

        if (!isDevOrTest || useInMemory === 'false') {
          return pool;
        }

        const isDefaultDemoConfig =
          (host === 'localhost' || host === '127.0.0.1') &&
          (!password || password === 'change_me') &&
          (!database || database === 'advisora') &&
          (!user || user === 'postgres');

        try {
          await pool.query('SELECT 1');
          return pool;
        } catch (err) {
          await pool.end().catch(() => undefined);
          if (isDefaultDemoConfig && isLocalConnectionRefusedError(err)) {
            console.warn(
              `[DEV/DEMO ONLY] Local default PostgreSQL is not running (${err instanceof Error ? err.message : 'connection refused'}) — using non-persistent in-memory PostgreSQL adapter`,
            );
            return createInMemoryPgPool();
          }
          throw err instanceof Error ? err : new Error('PostgreSQL connection check failed');
        }
      },
    },
    DatabaseService,
  ],
  exports: [PG_POOL, DatabaseService],
})
export class DatabaseModule {}
