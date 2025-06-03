import {
  EVENT_QUERY_PAGED_REQUEST,
  EVENT_QUERY_PAGED_RESPONSE,
  EVENT_QUERY_SINGLE_REQUEST,
  EVENT_QUERY_SINGLE_RESPONSE,
} from '../broker/broker.constants';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { QueryService } from './query.service';
import { QueryPagedRequest, QueryRequest } from './query.type';
import { InjectionToken } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';

const moduleMocker = new ModuleMocker(global);

describe('QueryService', () => {
  let moduleRef: TestingModule;
  let queryService: QueryService;
  let mqttBrokerService: MqttBrokerService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [QueryService],
    })
      .useMocker(mockFactory)
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
      jest
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
      jest
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
      jest
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
      jest
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
      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => false);

      await expect(
        queryService.queryPaged({
          res: 'evva-components',
        }),
      ).rejects.toThrow();
    });

    it('should emit EVENT_QUERY_PAGED_REQUEST', async () => {
      jest
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
      jest
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
      jest
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
      jest
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

  const mockFactory = (token: InjectionToken) => {
    if (typeof token === 'function') {
      const mockMetadata = moduleMocker.getMetadata(
        token,
      ) as MockFunctionMetadata<any, any>;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const Mock = moduleMocker.generateFromMetadata(mockMetadata);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
      const mock = new Mock();

      if (mockMetadata.name === 'MqttBrokerService') {
        mqttBrokerService = mock as MqttBrokerService;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return mock;
    }
    return {};
  };
});
