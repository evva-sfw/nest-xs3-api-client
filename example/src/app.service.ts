import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientConnectOptions,
  ClientService,
  Resource,
} from '@evva/nest-xs3-api-client';
import { readFile } from 'node:fs/promises';

@Injectable()
export class AppService {
  constructor(
    private readonly client: ClientService,
    private readonly config: ConfigService,
  ) {}

  async query(res: Resource) {
    try {
      await this.connect();
      return await this.client.queryPaged({ res });
    } catch (err) {
      console.error(err);
    } finally {
      await this.disconnect();
    }
    return null;
  }

  private async connect() {
    const [cert, ca, key] = await Promise.all([
      readFile(this.config.getOrThrow('XS3_CERT')),
      readFile(this.config.getOrThrow('XS3_CA')),
      readFile(this.config.getOrThrow('XS3_KEY')),
    ]);
    await this.client.connect({
      host: this.config.getOrThrow('XS3_HOST'),
      port: +this.config.getOrThrow('XS3_PORT'),
      protocol:
        this.config.getOrThrow<ClientConnectOptions['protocol']>(
          'XS3_PROTOCOL',
        ),
      cert,
      ca,
      key,
      clientId: this.config.getOrThrow('XS3_CLIENT_ID'),
      token: this.config.getOrThrow('XS3_TOKEN'),
      skipHostnameVerification: true,
    });
  }

  private async disconnect() {
    await this.client.disconnect();
  }
}
