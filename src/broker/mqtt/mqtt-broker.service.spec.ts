import { CommandRequest } from '../../command/command';
import {
  QueryPagedRequest,
  QueryRequest,
  QueryResponse,
} from '../../query/query.type';
import {
  EVENT_ACCESS_PROTOCOL_RECEIVED,
  EVENT_CQRS_RESPONSE,
  EVENT_ERROR_RESPONSE,
  EVENT_QUERY_PAGED_RESPONSE,
  EVENT_QUERY_SINGLE_RESPONSE,
} from '../broker.events';
import { BROKER_TOPIC_PREFIXES, BROKER_TOPICS } from './mqtt-broker.constants';
import { MqttBrokerService } from './mqtt-broker.service';
import { MqttService } from '@evva/nest-mqtt';
import { InjectionToken } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { MqttClient } from 'mqtt';

const moduleMocker = new ModuleMocker(global);

describe('MqttBrokerService', () => {
  let moduleRef: TestingModule;
  let mqttBrokerService: MqttBrokerService;
  let mqttService: MqttService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [MqttBrokerService],
    })
      .useMocker(mockFactory)
      .compile();

    await moduleRef.init();

    eventEmitter = await moduleRef.resolve(EventEmitter2);
    mqttBrokerService = await moduleRef.resolve(MqttBrokerService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('isConnected()', () => {
    it('should return true on connected', () => {
      jest.spyOn(mqttService, 'getClient').mockImplementation(() => {
        return { connected: true } as unknown as MqttClient;
      });
      expect(mqttBrokerService.isConnected()).toBeTruthy();
    });

    it('should return false on no connection', () => {
      jest.spyOn(mqttService, 'getClient').mockImplementation(() => {
        return { connected: false } as unknown as MqttClient;
      });
      expect(mqttBrokerService.isConnected()).toBeFalsy();
    });

    it('should return false on no client', () => {
      jest.spyOn(mqttService, 'getClient').mockImplementation(() => {
        return null as MqttClient;
      });
      expect(mqttBrokerService.isConnected()).toBeFalsy();
    });
  });

  describe('handleCQRSEvent()', () => {
    it('should emit EVENT_CQRS_RESPONSE', async () => {
      const promise = new Promise<boolean>((res) => {
        eventEmitter.on(EVENT_CQRS_RESPONSE, () => {
          res(true);
        });
      });
      mqttBrokerService.handleCQRSEvent({ foo: 'bar' });

      expect(await promise).toBeTruthy();
    });
  });

  describe('handleAccessProtocolEvent()', () => {
    it('should emit EVENT_ACCESS_PROTOCOL_RECEIVED', async () => {
      const promise = new Promise<boolean>((res) => {
        eventEmitter.on(EVENT_ACCESS_PROTOCOL_RECEIVED, () => {
          res(true);
        });
      });
      mqttBrokerService.handleAccessProtocolEvent({ foo: 'bar' });

      expect(await promise).toBeTruthy();
    });
  });

  describe('handleQueryResponseEvent()', () => {
    const requestId = '7950ed5a-ddc1-4033-ac11-3487dac8cf3b';

    it('should emit EVENT_QUERY_SINGLE_RESPONSE', async () => {
      const promise = new Promise<QueryResponse>((res) => {
        eventEmitter.on(
          EVENT_QUERY_SINGLE_RESPONSE,
          (payload: QueryResponse) => {
            res(payload);
          },
        );
      });
      mqttBrokerService.handleQueryResponseEvent({
        requestId: requestId,
        response: { foo: 'bar' },
      });
      const result = await promise;

      expect(result.response?.hasOwnProperty('foo')).toBeTruthy();
    });

    it('should emit EVENT_QUERY_PAGED_RESPONSE', async () => {
      const promise = new Promise<QueryResponse>((res) => {
        eventEmitter.on(
          EVENT_QUERY_PAGED_RESPONSE,
          (payload: QueryResponse) => {
            res(payload);
          },
        );
      });
      mqttBrokerService.handleQueryResponseEvent({
        requestId: requestId,
        response: { foo: 'bar', totalCount: 1 },
      });
      const result = await promise;

      expect(result.response?.hasOwnProperty('foo')).toBeTruthy();
    });
  });

  describe('handleQueryErrorEvent()', () => {
    it('should emit EVENT_ERROR_RESPONSE', async () => {
      type ErrorType = { error: string };

      const promise = new Promise<ErrorType>((res) => {
        eventEmitter.on(EVENT_ERROR_RESPONSE, (payload: ErrorType) => {
          res(payload);
        });
      });
      mqttBrokerService.handleQueryErrorEvent({ error: 'error' });

      expect((await promise)?.hasOwnProperty('error')).toBeTruthy();
    });
  });

  describe('publishQuery()', () => {
    it('should publish to BROKER_TOPICS.QUERY_OUT', async () => {
      const promise = new Promise<string>((res) => {
        jest
          .spyOn(mqttService, 'publish')
          .mockImplementation((topic: string) => {
            res(topic);
            return null;
          });
      });
      void mqttBrokerService.publishQuery({} as QueryRequest);

      expect(await promise).toBe(BROKER_TOPICS.QUERY_OUT);
    });
  });

  describe('publishPageQuery()', () => {
    it('should publish to BROKER_TOPICS.QUERY_OUT', async () => {
      const promise = new Promise<string>((res) => {
        jest
          .spyOn(mqttService, 'publish')
          .mockImplementation((topic: string) => {
            res(topic);
            return null;
          });
      });
      void mqttBrokerService.publishPageQuery({} as QueryPagedRequest);

      expect(await promise).toBe(BROKER_TOPICS.QUERY_OUT);
    });
  });

  describe('publishCommand()', () => {
    it('should publish to BROKER_TOPIC_PREFIXES.CMD', async () => {
      const type = 'Login';
      const promise = new Promise<string>((res) => {
        jest
          .spyOn(mqttService, 'publish')
          .mockImplementation((topic: string) => {
            res(topic);
            return null;
          });
      });
      void mqttBrokerService.publishCommand({
        type: type,
      } as CommandRequest);

      expect(await promise).toBe(`${BROKER_TOPIC_PREFIXES.CMD}/${type}`);
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

      if (mockMetadata.name === 'MqttService') {
        mqttService = mock as MqttService;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return mock;
    }
    return {};
  };
});
