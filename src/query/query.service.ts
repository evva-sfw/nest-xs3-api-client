import {
  EVENT_QUERY_PAGED_REQUEST,
  EVENT_QUERY_SINGLE_REQUEST,
  EVENT_QUERY_SINGLE_RESPONSE,
  EVENT_QUERY_PAGED_RESPONSE,
} from '../broker/broker.constants';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { HashMap } from '../common/interface';
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
} from './query.type';
import { Payload } from '@evva/nest-mqtt';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';

@Injectable()
export class QueryService {
  private readonly logger = new Logger('QueryService');

  private queryRequests: HashMap<QueryTable> = {};
  private pageSize = 50;

  constructor(
    private readonly mqttBrokerService: MqttBrokerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Getter for `pageSize` used in auto-pagination mode.
   *
   * @returns {number}
   */
  getPageSize(): number {
    return this.pageSize;
  }

  /**
   * Setter for `pageSize` used in auto-pagination mode.
   *
   * @param size
   */
  setPageSize(size: number) {
    if (size < 1) {
      this.logger.error(`Invalid pageSize {${size}}`);
      return;
    }
    this.pageSize = size;
  }

  /**
   * Queries a single resource with an optional timeout.
   * Blocks and returns a `QueryResponse`.
   *
   * @param {Query} query
   * @param {number=} timeout
   * @throws
   * @returns {QueryResponse | null}
   */
  async query(
    query: Query,
    timeout: number = 5000,
  ): Promise<QueryResponse | null> {
    if (!this.mqttBrokerService.isConnected()) {
      return Promise.reject(new Error('Query failed: not connected to broker'));
    }
    const request = {
      requestId: randomUUID(),
      res: query.res,
      uuid: query.uuid,
    } as QueryRequest;

    this.eventEmitter.emit(EVENT_QUERY_SINGLE_REQUEST, request);

    return Promise.race([
      new Promise<QueryResponse>((resolver) => {
        this.queryRequests[request.requestId] = { task: resolver };
      }),
      new Promise<null>((resolver) => {
        this.queryRequests[request.requestId].taskTimeout = setTimeout(() => {
          delete this.queryRequests[request.requestId];
          resolver(null);
        }, timeout);
      }),
    ]);
  }

  /**
   * Queries a paged resource with an optional timeout.
   * Blocks and returns a `QueryPagedResponse` collection.
   *
   * If `limit` or `offset` are not set, the query will auto-paginate
   * and return all chunked results (`pageSize`).
   *
   * @param {QueryPaged} query
   * @param {number=} timeout
   * @throws
   * @returns {QueryPagedResponse[] | null}
   */
  async queryPaged(
    query: QueryPaged,
    timeout: number = 5000,
  ): Promise<QueryPagedResponse[] | null> {
    if (!this.mqttBrokerService.isConnected()) {
      return Promise.reject(new Error('Query failed: not connected to broker'));
    }
    const request = {
      requestId: randomUUID(),
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
        this.queryRequests[request.requestId].task = resolver;
      }),
      new Promise<null>((resolver) => {
        this.queryRequests[request.requestId].taskTimeout = setTimeout(() => {
          delete this.queryRequests[request.requestId];
          resolver(null);
        }, timeout);
      }),
    ]);
  }

  /**
   * Event handler for new query responses from broker.
   *
   * @param {QueryResponse} response
   * @protected
   */
  @OnEvent(EVENT_QUERY_SINGLE_RESPONSE, { async: true })
  protected onQueryResponse(@Payload() response: QueryResponse) {
    if (this.queryRequests[response.requestId]) {
      this.queryRequests[response.requestId].task(response);
      clearTimeout(this.queryRequests[response.requestId].taskTimeout);
      delete this.queryRequests[response.requestId];
    }
  }

  /**
   * Event handler for new paged query responses from broker.
   *
   * @param {QueryPagedResponse} response
   * @protected
   */
  @OnEvent(EVENT_QUERY_PAGED_RESPONSE, { async: true })
  protected onQueryPagedResponse(@Payload() response: QueryPagedResponse) {
    if (this.queryRequests[response.requestId]) {
      const handler =
        this.queryRequests[response.requestId].pageHandlers?.pop();
      if (handler) handler(response);
    }
  }

  /**
   * Page handler that aggregates the page results and emits
   * upcoming page requests.
   *
   * @param {QueryPagedResponse} response
   * @private
   */
  private handlePage(response: QueryPagedResponse) {
    const query = this.queryRequests[response.requestId];
    if (!query) return;

    query.result.push(response);

    if (query.pageOne && query.autoPaginate) {
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
      this.logger.debug(`Auto-paginating with pageSize {${this.pageSize}}`);

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
      query.task(query.result);
      clearTimeout(this.queryRequests[response.requestId].taskTimeout);
      delete this.queryRequests[response.requestId];
    }
  }

  /**
   * Helper for determining the further needed page requests
   * based on the set `pageSize`.
   *
   * @param {number} total
   * @returns {QueryPageRequest[]}
   * @private
   */
  private getRemainingPageRequests(total: number): QueryPageRequest[] {
    if (!total || total <= this.pageSize) {
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
    if (remainder > 0) {
      reqs.push({
        pageOffset: numPages * this.pageSize,
        pageLimit: remainder,
      });
    }
    return reqs.reverse();
  }
}
