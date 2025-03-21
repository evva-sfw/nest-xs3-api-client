import { Inject, Injectable, Logger } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './client.module-definition';
import { ClientModuleOptions } from './client.module-options';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_QUERY_RESOURCE_PAGED } from '../broker/broker.events';

@Injectable()
export class ClientService {
  private readonly logger = new Logger('ClientService');

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: ClientModuleOptions,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  sendSingleQuery() {
    this.logger.log('sendSingleQuery()');

    this.eventEmitter.emit(EVENT_QUERY_RESOURCE_PAGED, {
      res: 'persons',
      token: this.options.token,
    });
  }
}
