import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppService } from './app.service.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const service = app.get(AppService);
    const payload = await service.query('identification-media');
    console.log(payload);
  } finally {
    await app.close();
  }
}
await bootstrap();
