import { Inject, Injectable, Logger } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './client.module-definition';
import { ClientModuleOptions } from './client.module-options';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_QUERY_RESOURCE_PAGED } from '../broker/broker.events';
import { Resource } from '../common/resource';

@Injectable()
export class ClientService {
  private readonly logger = new Logger('ClientService');

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: ClientModuleOptions,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  sendPagedQuery() {
    this.logger.log('sendPagedQuery()');

    this.eventEmitter.emit(EVENT_QUERY_RESOURCE_PAGED, {
      res: Resource.Persons,
      token: this.options.token,
    });
  }
}
