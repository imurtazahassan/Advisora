import { randomBytes } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

const EPHEMERAL_JWT_SECRET = randomBytes(32).toString('hex');

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = (config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development')
          .trim()
          .toLowerCase();
        const isDevOrTest = nodeEnv === 'development' || nodeEnv === 'test';
        const rawSecret = config.get<string>('JWT_SECRET')?.trim();
        const isPlaceholder = !rawSecret || rawSecret === 'replace_with_a_long_random_secret' || rawSecret === 'change_me';
        if (isPlaceholder) {
          if (!isDevOrTest) {
            throw new Error('JWT_SECRET must be configured with a persistent secret outside development/test mode.');
          }
          console.warn('[DEV/DEMO ONLY] JWT_SECRET not configured — using ephemeral development runtime secret');
          return {
            secret: EPHEMERAL_JWT_SECRET,
            signOptions: { expiresIn: '1h' },
          };
        }
        return {
          secret: rawSecret,
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, AuthGuard],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
