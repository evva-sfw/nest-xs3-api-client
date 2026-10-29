import {
  EVENT_QUERY_PAGED_REQUEST,
  EVENT_QUERY_SINGLE_REQUEST,
  EVENT_QUERY_SINGLE_RESPONSE,
  EVENT_QUERY_PAGED_RESPONSE,
  EVENT_ERROR_RESPONSE,
  EVENT_BROKER_DISCONNECTED,
  EVENT_QUERY_MALFORMED_RESPONSE,
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
  QueryResolver,
  QueryTable,
  QueryErrorResponse,
  QueryError,
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
      throw new QueryError(
        'disconnected',
        'Query failed: not connected to broker',
      );
    }
    const request = {
      requestId: randomUUID(),
      res: query.res,
      uuid: query.uuid,
    } as QueryRequest;

    return new Promise<QueryResponse | null>((resolve, reject) => {
      this.queryRequests[request.requestId] = {
        kind: 'single',
        task: resolve as QueryResolver,
        reject,
        taskTimeout: setTimeout(() => {
          delete this.queryRequests[request.requestId];
          if (!this.mqttBrokerService.isConnected()) {
            reject(
              new QueryError(
                'disconnected',
                'Query interrupted because the broker disconnected',
                request.requestId,
              ),
            );
            return;
          }
          resolve(null);
        }, timeout),
      };
      this.eventEmitter.emit(EVENT_QUERY_SINGLE_REQUEST, request);
    });
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
      throw new QueryError(
        'disconnected',
        'Query failed: not connected to broker',
      );
    }
    const request = {
      requestId: randomUUID(),
      res: query.res,
      offset: query.offset || 0,
      limit: query.limit || this.pageSize,
      filters: query.filters || [],
    } as QueryPagedRequest;

    return new Promise<QueryPagedResponse[] | null>((resolve, reject) => {
      this.queryRequests[request.requestId] = {
        kind: 'paged',
        resource: query.res,
        task: resolve as QueryResolver,
        reject,
        filters: query.filters,
        autoPaginate: !query.limit && !query.offset,
        pageHandlers: [this.handlePage.bind(this) as QueryPageHandler],
        pageRequests: [],
        pageOne: true,
        result: [],
        taskTimeout: setTimeout(() => {
          delete this.queryRequests[request.requestId];
          if (!this.mqttBrokerService.isConnected()) {
            reject(
              new QueryError(
                'disconnected',
                'Query interrupted because the broker disconnected',
                request.requestId,
              ),
            );
            return;
          }
          resolve(null);
        }, timeout),
      } as QueryTable;

      this.eventEmitter.emit(EVENT_QUERY_PAGED_REQUEST, request);
    });
  }

  /**
   * Event handler for new query responses from broker.
   *
   * @param {QueryResponse} response
   * @protected
   */
  @OnEvent(EVENT_QUERY_SINGLE_RESPONSE, { async: true })
  protected onQueryResponse(@Payload() response: QueryResponse) {
    const request = this.queryRequests[response.requestId];
    if (!request) return;
    if (request.kind === 'paged') {
      this.rejectMalformedResponse(response.requestId, request);
      return;
    }
    request.task(response);
    clearTimeout(request.taskTimeout);
    delete this.queryRequests[response.requestId];
  }

  /**
   * Event handler for new paged query responses from broker.
   *
   * @param {QueryPagedResponse} response
   * @protected
   */
  @OnEvent(EVENT_QUERY_PAGED_RESPONSE, { async: true })
  protected onQueryPagedResponse(@Payload() response: QueryPagedResponse) {
    const request = this.queryRequests[response.requestId];
    if (!request) return;
    if (request.kind === 'single') {
      this.rejectMalformedResponse(response.requestId, request);
      return;
    }
    const handler = request.pageHandlers?.pop();
    if (handler) handler(response);
  }

  @OnEvent(EVENT_QUERY_MALFORMED_RESPONSE, { async: true })
  protected onMalformedQueryResponse(
    @Payload() payload: { requestId?: string },
  ) {
    if (!payload.requestId) return;
    const request = this.queryRequests[payload.requestId];
    if (request) this.rejectMalformedResponse(payload.requestId, request);
  }

  private rejectMalformedResponse(requestId: string, request: QueryTable) {
    clearTimeout(request.taskTimeout);
    delete this.queryRequests[requestId];
    request.reject?.(
      new QueryError(
        'malformed-response',
        'Xesar returned a malformed query response',
        requestId,
      ),
    );
  }

  /**
   * Rejects a correlated query when Xesar publishes an API error.
   * Command errors are ignored here because they have no matching query request.
   */
  @OnEvent(EVENT_ERROR_RESPONSE, { async: true })
  protected onQueryError(@Payload() response: QueryErrorResponse) {
    const correlationId = response.correlationId;
    if (!correlationId) return;

    const request = this.queryRequests[correlationId];
    if (!request?.reject) return;

    clearTimeout(request.taskTimeout);
    delete this.queryRequests[correlationId];

    const code = this.getQueryErrorCode(response.error);
    request.reject(
      new QueryError(
        code,
        response.reason || `Xesar query failed (${response.error})`,
        correlationId,
        response.error,
      ),
    );
  }

  @OnEvent(EVENT_BROKER_DISCONNECTED, { async: true })
  protected onBrokerDisconnected() {
    for (const [requestId, request] of Object.entries(this.queryRequests)) {
      if (!request.reject) continue;

      clearTimeout(request.taskTimeout);
      delete this.queryRequests[requestId];
      request.reject(
        new QueryError(
          'disconnected',
          'Query interrupted because the broker disconnected',
          requestId,
        ),
      );
    }
  }

  private getQueryErrorCode(statusCode: number) {
    if (statusCode === 401 || statusCode === 403) return 'permission' as const;
    if (statusCode === 400 || statusCode === 422) return 'validation' as const;
    if (statusCode === 404) return 'not-found' as const;
    if (statusCode === 408 || statusCode === 504) return 'timeout' as const;
    return 'upstream' as const;
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

    query.result = [...(query.result ?? []), response];

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

    if (query.pageRequests && query.pageRequests.length > 0) {
      this.logger.debug(`Auto-paginating with pageSize {${this.pageSize}}`);

      const r = query.pageRequests.pop()!;

      query.pageHandlers?.push(this.handlePage.bind(this) as QueryPageHandler);

      this.eventEmitter.emit(EVENT_QUERY_PAGED_REQUEST, {
        requestId: response.requestId,
        res: query.resource,
        offset: r.pageOffset,
        limit: r.pageLimit,
        filters: query.filters,
      });
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
