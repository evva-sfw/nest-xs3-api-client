import {
  EVENT_COMMAND_SEND,
  EVENT_QUERY_PAGED_REQUEST,
  EVENT_QUERY_SINGLE_REQUEST,
  EVENT_QUERY_SINGLE_RESPONSE,
  EVENT_QUERY_PAGED_RESPONSE,
} from '../broker/broker.events';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { Command } from '../common/command';
import {
  Query,
  QueryPaged,
  QueryPagedFilter,
  QueryPagedResponse,
  QueryPageRequest,
  QueryResponse,
} from '../common/query';
import { Resource } from '../common/resource';
import { Payload } from '@evva/nest-mqtt';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QueryService {
  private readonly logger = new Logger('QueryService');

  // QuerySingle
  private resource: Resource;

  // QueryPaged
  private uuid: string;
  private pageSize = 25;
  private filters: QueryPagedFilter[];
  private handlers: ((r: QueryPagedResponse) => void)[];
  private requests: QueryPageRequest[];
  private response: QueryPagedResponse;
  private firstRun: boolean;

  // Resolvers
  private queryResolver: (
    value: QueryResponse | PromiseLike<QueryResponse>,
  ) => void = null;
  private queryPagedResolver: (
    value: QueryPagedResponse | PromiseLike<QueryPagedResponse>,
  ) => void = null;

  constructor(
    private readonly mqttBrokerService: MqttBrokerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // MARK: - Queries

  /**
   * Queries a single resource with an optional timeout.
   * Blocks and returns a QueryResponse.
   *
   * @param {Query} query
   * @param {number=} timeout
   * @returns {QueryResponse}
   */
  async querySingle(
    query: Query,
    timeout: number = 5000,
  ): Promise<QueryResponse> {
    this.clearState();

    if (!this.mqttBrokerService.isConnected()) {
      this.logger.error('Query failed: not connected to broker');
      return null;
    }
    this.eventEmitter.emit(EVENT_QUERY_SINGLE_REQUEST, query);

    return Promise.race([
      new Promise<QueryResponse>((resolver) => {
        this.queryResolver = resolver;
      }),
      new Promise<null>((res) => {
        setTimeout(() => {
          this.queryResolver = null;
          res(null);
        }, timeout);
      }),
    ]);
  }

  /**
   * Queries a paged resource with an optional timeout.
   * Blocks and returns a QueryPagedResponse.
   *
   * @param {QueryPaged} query
   * @param {number=} timeout
   * @returns {QueryPagedResponse}
   */
  async queryPaged(
    query: QueryPaged,
    timeout: number = 5000,
  ): Promise<QueryPagedResponse> {
    this.clearState();

    this.uuid = uuidv4();
    this.resource = query.res;
    this.filters = query.filters;

    query.offset = 0;
    query.limit = this.pageSize;
    query.uuid = this.uuid;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.handlers.push(this.handlePage.bind(this));

    this.eventEmitter.emit(EVENT_QUERY_PAGED_REQUEST, query);

    return Promise.race([
      new Promise<QueryPagedResponse>((resolver) => {
        this.queryPagedResolver = resolver;
      }),
      new Promise<null>((res) => {
        setTimeout(() => {
          this.queryPagedResolver = null;
          res(null);
        }, timeout);
      }),
    ]);
  }

  // MARK: - Commands

  // async sendCommand(c: Command) {
  //   this.eventEmitter.emit(EVENT_COMMAND_SEND, c);
  // }

  // MARK: - Events

  @OnEvent(EVENT_QUERY_SINGLE_RESPONSE)
  protected onQueryResponse(@Payload() response: QueryResponse) {
    if (this.queryResolver) this.queryResolver(response);
  }

  @OnEvent(EVENT_QUERY_PAGED_RESPONSE)
  protected onQueryPagedResponse(@Payload() response: QueryPagedResponse) {
    if (this.uuid != response.requestId) {
      return;
    }
    const handler = this.handlers.pop();
    if (handler) handler(response);
  }

  // MARK: - QueryPaged

  private handlePage(r: QueryPagedResponse) {
    if (this.firstRun) {
      if (this.filters) {
        this.requests = this.getRemainingPageRequests(r.response.filterCount);
      } else {
        this.requests = this.getRemainingPageRequests(r.response.totalCount);
      }
      this.firstRun = false;
      this.response = r;
    } else {
      this.response.response.data.push(...r.response.data);
    }

    if (this.requests.length > 0) {
      const req = this.requests.pop();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.handlers.push(this.handlePage.bind(this));

      this.eventEmitter.emit(EVENT_QUERY_PAGED_REQUEST, {
        res: this.resource,
        offset: req.pageOffset,
        limit: req.pageLimit,
        filters: this.filters,
        uuid: this.uuid,
      } as QueryPaged);
    } else {
      if (this.queryPagedResolver) this.queryPagedResolver(this.response);
    }
  }

  private getRemainingPageRequests(total: number): QueryPageRequest[] {
    if (total <= this.pageSize) {
      return [];
    }
    const reqs: QueryPageRequest[] = [];
    const remainder = total % this.pageSize;
    const numPages = (total - remainder) / this.pageSize;

    for (let page = 1; page < numPages; page++) {
      reqs.push({
        pageOffset: page * this.pageSize,
        pageLimit: this.pageSize,
      });
    }
    reqs.push({
      pageOffset: numPages * this.pageSize,
      pageLimit: remainder,
    });

    return reqs.reverse();
  }

  /**
   * Clears all state variables used for queries.
   *
   * @private
   */
  private clearState() {
    this.filters = [];
    this.handlers = [];
    this.requests = [];
    this.response = null;
    this.firstRun = true;

    this.queryPagedResolver = null;
    this.queryResolver = null;
  }
}
