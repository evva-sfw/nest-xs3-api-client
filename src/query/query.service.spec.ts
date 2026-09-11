import {
  EVENT_QUERY_PAGED_REQUEST,
  EVENT_QUERY_PAGED_RESPONSE,
  EVENT_QUERY_SINGLE_REQUEST,
  EVENT_QUERY_SINGLE_RESPONSE,
} from '../broker/broker.constants';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { QueryService } from './query.service';
import { QueryPagedRequest, QueryRequest } from './query.type';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, afterEach, beforeEach, it, expect, MockedObject } from 'vitest';

describe('QueryService', () => {
  let moduleRef: TestingModule;
  let queryService: QueryService;
  let mqttBrokerService: MockedObject<MqttBrokerService>;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    mqttBrokerService = vi.mockObject(MqttBrokerService.prototype);
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        QueryService,
        { provide: MqttBrokerService, useValue: mqttBrokerService }
      ],
    })
      .compile();

    await moduleRef.init();

    eventEmitter = await moduleRef.resolve(EventEmitter2);
    queryService = await moduleRef.resolve(QueryService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('getPageSize()', () => {
    it('should return default page size', () => {
      expect(queryService.getPageSize()).toBe(50);
    });
  });

  describe('setPageSize()', () => {
    it('should set the page size', () => {
      const size = 117;
      queryService.setPageSize(size);

      expect(queryService.getPageSize()).toBe(size);
    });

    it('should return on faulty param', () => {
      queryService.setPageSize(117);
      queryService.setPageSize(-1);

      expect(queryService.getPageSize()).toBe(117);
    });
  });

  describe('query()', () => {
    it('should throw on no connection', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => false);

      await expect(
        queryService.query({
          res: 'evva-components',
          uuid: '7950ed5a-ddc1-4033-ac11-3487dac8cf3b',
        }),
      ).rejects.toThrow();
    });

    it('should emit EVENT_QUERY_SINGLE_REQUEST', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      const asyncEvent = new Promise<string>((resolve) => {
        eventEmitter.on(EVENT_QUERY_SINGLE_REQUEST, (payload: QueryRequest) => {
          resolve(payload.requestId);
        });
      });
      void queryService.query({
        res: 'evva-components',
        uuid: '7950ed5a-ddc1-4033-ac11-3487dac8cf3b',
      });
      const requestId = await asyncEvent;
      await eventEmitter.emitAsync(EVENT_QUERY_SINGLE_RESPONSE, {
        requestId: requestId,
        response: {},
      });
      expect(requestId).toBeDefined();
    });

    it('should return query response', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      eventEmitter.on(EVENT_QUERY_SINGLE_REQUEST, (payload: QueryRequest) => {
        eventEmitter.emit(EVENT_QUERY_SINGLE_RESPONSE, {
          requestId: payload.requestId,
          response: { foo: 'bar' },
        });
      });
      const result = await queryService.query({
        res: 'evva-components',
        uuid: '7950ed5a-ddc1-4033-ac11-3487dac8cf3b',
      });

      expect(result.response['foo']).toBe('bar');
    });

    it('should return null on timeout', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      const asyncEvent = new Promise<string>((resolve) => {
        eventEmitter.on(
          EVENT_QUERY_SINGLE_REQUEST,
          (payload: QueryPagedRequest) => {
            resolve(payload.requestId);
          },
        );
      });
      const query = queryService.query(
        {
          res: 'evva-components',
          uuid: '7950ed5a-ddc1-4033-ac11-3487dac8cf3b',
        },
        100, // timeout
      );
      await asyncEvent;
      const result = await query;

      expect(result).toBeNull();
    });
  });

  describe('queryPaged()', () => {
    it('should throw on no connection', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => false);

      await expect(
        queryService.queryPaged({
          res: 'evva-components',
        }),
      ).rejects.toThrow();
    });

    it('should emit EVENT_QUERY_PAGED_REQUEST', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      const asyncEvent = new Promise<string>((resolve) => {
        eventEmitter.on(
          EVENT_QUERY_PAGED_REQUEST,
          (payload: QueryPagedRequest) => {
            resolve(payload.requestId);
          },
        );
      });
      void queryService.queryPaged({
        res: 'evva-components',
      });
      const requestId = await asyncEvent;
      await eventEmitter.emitAsync(EVENT_QUERY_PAGED_RESPONSE, {
        requestId: requestId,
        response: {},
      });
      expect(requestId).toBeDefined();
    });

    it('should return query response', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      eventEmitter.on(
        EVENT_QUERY_PAGED_REQUEST,
        (payload: QueryPagedRequest) => {
          eventEmitter.emit(EVENT_QUERY_PAGED_RESPONSE, {
            requestId: payload.requestId,
            response: {
              data: [{ foo: 'bar' }],
              filteredCount: 1,
              totalCount: 1,
            },
          });
        },
      );
      const result = await queryService.queryPaged({
        res: 'evva-components',
      });

      expect(result).toBeDefined();
      expect(result.pop()?.response?.data.pop()?.['foo']).toBe('bar');
    });

    it('should return paginated query response', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      queryService.setPageSize(1);
      eventEmitter.on(
        EVENT_QUERY_PAGED_REQUEST,
        (payload: QueryPagedRequest) => {
          eventEmitter.emit(EVENT_QUERY_PAGED_RESPONSE, {
            requestId: payload.requestId,
            response: {
              data: [{ foo: 'bar' }],
              filteredCount: 3,
              totalCount: 3,
            },
          });
        },
      );
      const result = await queryService.queryPaged({
        res: 'evva-components',
      });

      expect(result?.length).toBe(3);
    });

    it('should return null on timeout', async () => {
      vi
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      const asyncEvent = new Promise<string>((resolve) => {
        eventEmitter.on(
          EVENT_QUERY_PAGED_REQUEST,
          (payload: QueryPagedRequest) => {
            resolve(payload.requestId);
          },
        );
      });
      const query = queryService.queryPaged(
        {
          res: 'evva-components',
        },
        100, // timeout
      );
      await asyncEvent;
      const result = await query;

      expect(result).toBeNull();
    });
  });
});
