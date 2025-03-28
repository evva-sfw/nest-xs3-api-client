import {
  EVENT_QUERY_PAGED_REQUEST,
  EVENT_QUERY_SINGLE_REQUEST,
  EVENT_QUERY_SINGLE_RESPONSE,
  EVENT_QUERY_PAGED_RESPONSE,
} from '../broker/broker.events';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { HashTable } from '../common/interface';
import {
  Query,
  QueryPaged,
  QueryPagedRequest,
  QueryPagedResponse,
  QueryPageHandler,
  QueryPageRequest,
  QueryRequest,
  QueryResponse,
  QueryTable,
} from '../common/query';
import { Payload } from '@evva/nest-mqtt';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QueryService {
  private readonly logger = new Logger('QueryService');

  private queryRequests: HashTable<QueryTable> = {};
  private pageSize = 25;

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
    if (!this.mqttBrokerService.isConnected()) {
      this.logger.error('Query failed: not connected to broker');
      return null;
    }
    const request = {
      requestId: uuidv4(),
      res: query.res,
      uuid: query.uuid,
    } as QueryRequest;

    this.eventEmitter.emit(EVENT_QUERY_SINGLE_REQUEST, request);

    return Promise.race([
      new Promise<QueryResponse>((resolver) => {
        this.queryRequests[request.requestId] = { resolver: resolver };
      }),
      new Promise<null>((res) => {
        setTimeout(() => {
          delete this.queryRequests[request.requestId];
          res(null);
        }, timeout);
      }),
    ]);
  }

  /**
   * Queries a paged resource with an optional timeout.
   * Blocks and returns a `QueryPagedResponse` array.
   *
   * If `limit` or `offset` are not set, the query will auto-paginate
   * and return all chunked results.
   *
   * @param {QueryPaged} query
   * @param {number=} timeout
   * @returns {QueryPagedResponse[]}
   */
  async queryPaged(
    query: QueryPaged,
    timeout: number = 5000,
  ): Promise<QueryPagedResponse[]> {
    if (!this.mqttBrokerService.isConnected()) {
      this.logger.error('Query failed: not connected to broker');
      return null;
    }
    const request = {
      requestId: uuidv4(),
      res: query.res,
      offset: query.offset || 0,
      limit: query.limit || this.pageSize,
      filters: query.filters || [],
    } as QueryPagedRequest;

    this.queryRequests[request.requestId] = {
      resource: query.res,
      filters: query.filters,
      autoPaginate: !query.limit && !query.offset,
      pageHandlers: [this.handlePage.bind(this) as QueryPageHandler],
      pageRequests: [],
      pageOne: true,
      result: [],
    } as QueryTable;

    this.eventEmitter.emit(EVENT_QUERY_PAGED_REQUEST, request);

    return Promise.race([
      new Promise<QueryPagedResponse[]>((resolver) => {
        this.queryRequests[request.requestId].resolver = resolver;
      }),
      new Promise<null>((res) => {
        setTimeout(() => {
          delete this.queryRequests[request.requestId];
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
    if (this.queryRequests[response.requestId]) {
      this.queryRequests[response.requestId].resolver(response);
      delete this.queryRequests[response.requestId];
    }
  }

  @OnEvent(EVENT_QUERY_PAGED_RESPONSE)
  protected onQueryPagedResponse(@Payload() response: QueryPagedResponse) {
    if (this.queryRequests[response.requestId]) {
      const handler =
        this.queryRequests[response.requestId].pageHandlers?.pop();
      if (handler) handler(response);
    }
  }

  // MARK: - QueryPaged

  private handlePage(response: QueryPagedResponse) {
    const query = this.queryRequests[response.requestId];
    if (!query) return;

    query.result.push(response);

    if (query.pageOne && query.autoPaginate) {
      this.logger.debug(`Auto-paginating with size {${this.pageSize}}`);

      if (query.filters) {
        query.pageRequests = this.getRemainingPageRequests(
          response.response.filterCount,
        );
      } else {
        query.pageRequests = this.getRemainingPageRequests(
          response.response.totalCount,
        );
      }
      query.pageOne = false;
    }

    if (query.pageRequests.length > 0) {
      const r = query.pageRequests.pop();

      query.pageHandlers.push(this.handlePage.bind(this) as QueryPageHandler);

      this.eventEmitter.emit(EVENT_QUERY_PAGED_REQUEST, {
        requestId: response.requestId,
        res: query.resource,
        offset: r.pageOffset,
        limit: r.pageLimit,
        filters: query.filters,
      } as QueryPagedRequest);
    } else {
      query.resolver(query.result);
      delete this.queryRequests[response.requestId];
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
}
