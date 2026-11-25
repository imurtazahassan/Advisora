import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const frontendDist = join(__dirname, '..', '..', '..', 'frontend', 'dist');
  const distFromSrc = join(__dirname, '..', '..', 'frontend', 'dist');
  const staticDir = existsSync(frontendDist) ? frontendDist : existsSync(distFromSrc) ? distFromSrc : null;
  if (staticDir) {
    app.use(express.static(staticDir));
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
