import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { fileURLToPath } from 'node:url';
import { AppService } from './app.service.js';
import { ClientModule } from '@evva/nest-xs3-api-client';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: fileURLToPath(new URL('../.env.local', import.meta.url)),
      isGlobal: true,
    }),
    ClientModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
