import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { CommandCQRS, CommandDataRelaisBoardConfig } from '../command/command';
import { CommandService } from '../command/command.service';
import { HashMap } from '../common/interface';
import { QueryService } from '../query/query.service';
import {
  Query,
  QueryPaged,
  QueryPagedResponse,
  QueryResponse,
} from '../query/query.type';
import { ClientConnectOptions } from './client-connect.options';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ClientService {
  private readonly logger = new Logger('ClientService');
  private lastConnectErrorCode?: string;

  constructor(
    private readonly mqttBrokerService: MqttBrokerService,
    private readonly queryService: QueryService,
    private readonly commandService: CommandService,
  ) {}

  async connect(options: ClientConnectOptions): Promise<boolean> {
    this.lastConnectErrorCode = undefined;
    try {
      await this.mqttBrokerService.connect({
        host: options.host,
        port: options.port,
        cert: options.cert,
        ca: options.ca,
        key: options.key,
        clientId: options.clientId,
        token: options.token,
        logPayloads: options.logPayloads,
        skipHostnameVerification: options.skipHostnameVerification,
      } as ClientConnectOptions);
    } catch (error: unknown) {
      this.lastConnectErrorCode = this.safeConnectionErrorCode(error);
      this.logger.error(
        `Failed to connect to broker (${this.lastConnectErrorCode})`,
      );
      return false;
    }
    return true;
  }

  async disconnect(): Promise<boolean> {
    try {
      await this.mqttBrokerService.disconnect();
    } catch (e: any) {
      this.logger.error(`Failed to disconnect from broker: ${e}`);
      return false;
    }
    return true;
  }

  async query(q: Query): Promise<QueryResponse | null> {
    return this.queryService.query(q);
  }

  async queryPaged(q: QueryPaged): Promise<QueryPagedResponse[] | null> {
    return this.queryService.queryPaged(q);
  }

  async commandCQRS(type: CommandCQRS, data: HashMap<any>) {
    return this.commandService.cqrs(type, data);
  }

  async commandRB(rb: string, config: CommandDataRelaisBoardConfig) {
    return this.commandService.rb('ConfigureRelaisBoard', { rb, config });
  }

  isConnected(): boolean {
    return this.mqttBrokerService.isConnected();
  }

  getLastConnectErrorCode(): string | undefined {
    return this.lastConnectErrorCode;
  }

  private safeConnectionErrorCode(error: unknown): string {
    if (!error || typeof error !== 'object') return 'CONNECTION_ERROR';

    const candidate = error as { code?: unknown; reasonCode?: unknown };
    if (
      typeof candidate.reasonCode === 'number' &&
      Number.isInteger(candidate.reasonCode) &&
      candidate.reasonCode >= 0 &&
      candidate.reasonCode <= 255
    ) {
      return `MQTT_REASON_${candidate.reasonCode}`;
    }
    if (
      typeof candidate.code === 'string' &&
      /^(?:E[A-Z0-9_]*|ERR_[A-Z0-9_]+|CERT_[A-Z0-9_]+|UNABLE_[A-Z0-9_]+|DEPTH_[A-Z0-9_]+)$/.test(
        candidate.code,
      )
    ) {
      return candidate.code;
    }
    return 'CONNECTION_ERROR';
  }
}
