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

  constructor(
    private readonly mqttBrokerService: MqttBrokerService,
    private readonly queryService: QueryService,
    private readonly commandService: CommandService,
  ) {}

  async connect(options: ClientConnectOptions): Promise<boolean> {
    try {
      await this.mqttBrokerService.connect({
        host: options.host,
        port: options.port,
        cert: options.cert,
        ca: options.ca,
        key: options.key,
        clientId: options.clientId,
        token: options.token,
      } as ClientConnectOptions);
    } catch (e) {
      this.logger.error(`Failed to connect to broker: ${e}`);
      return false;
    }
    return true;
  }

  async disconnect(): Promise<boolean> {
    try {
      await this.mqttBrokerService.disconnect();
    } catch (e) {
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
}
