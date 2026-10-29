import { CommandRequest } from '../../command/command';
import {
  QueryPagedRequest,
  QueryRequest,
  QueryResponse,
} from '../../query/query.type';
import {
  EVENT_ACCESS_PROTOCOL_RECEIVED,
  EVENT_BROKER_DISCONNECTED,
  EVENT_CQRS_RESPONSE,
  EVENT_ERROR_RESPONSE,
  EVENT_QUERY_MALFORMED_RESPONSE,
  EVENT_QUERY_PAGED_RESPONSE,
  EVENT_QUERY_SINGLE_RESPONSE,
} from '../broker.constants';
import { BROKER_TOPIC_PREFIXES, BROKER_TOPICS } from './mqtt-broker.constants';
import { MqttBrokerService } from './mqtt-broker.service';
import { MqttPacket, MqttService } from '@evva/nest-mqtt';
import { Logger } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter } from 'node:events';
import {
  it,
  expect,
  vi,
  describe,
  beforeEach,
  afterEach,
  MockedObject,
} from 'vitest';

describe('MqttBrokerService', () => {
  let moduleRef: TestingModule;
  let mqttBrokerService: MqttBrokerService;
  let mqttService: MockedObject<MqttService>;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    mqttService = vi.mockObject(MqttService.prototype);

    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        MqttBrokerService,
        { provide: MqttService, useValue: mqttService },
      ],
    }).compile();

    await moduleRef.init();

    eventEmitter = moduleRef.get(EventEmitter2);
    mqttBrokerService = moduleRef.get(MqttBrokerService);

    await mockConnect();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await mqttBrokerService?.disconnect();
    await moduleRef?.close();
  });

  describe('isConnected()', () => {
    it('should return true on connected', () => {
      mqttService.getClient.mockImplementation(() => {
        return { connected: true } as ReturnType<MqttService['getClient']>;
      });
      expect(mqttBrokerService.isConnected()).toBeTruthy();
    });

    it('should return false on no connection', () => {
      mqttService.getClient.mockImplementation(() => {
        return { connected: false } as ReturnType<MqttService['getClient']>;
      });
      expect(mqttBrokerService.isConnected()).toBeFalsy();
    });

    it('should return false on no client', () => {
      mqttService.getClient.mockImplementation(() => {
        return undefined;
      });
      expect(mqttBrokerService.isConnected()).toBeFalsy();
    });
  });

  describe('connect()', () => {
    it('validates the broker certificate and emits unexpected disconnects', async () => {
      const mqttClient = new EventEmitter() as unknown as NonNullable<
        ReturnType<MqttService['getClient']>
      >;
      mqttService.connect.mockResolvedValue(undefined);
      mqttService.getClient.mockReturnValue(mqttClient);
      const disconnected = new Promise<void>((resolve) => {
        eventEmitter.once(EVENT_BROKER_DISCONNECTED, () => resolve());
      });

      await mqttBrokerService.connect({
        host: 'broker.local',
        port: 8883,
        protocol: 'mqtts',
        clientId: 'maintainer',
        token: 'test-token',
      });
      const defaultOptions = mqttService.connect.mock.calls.at(-1)?.[0];
      expect(defaultOptions).toMatchObject({ rejectUnauthorized: true });
      expect(defaultOptions?.checkServerIdentity).toBeUndefined();

      await mqttBrokerService.connect({
        host: 'broker.local',
        port: 8883,
        protocol: 'mqtts',
        clientId: 'maintainer',
        token: 'test-token',
        skipHostnameVerification: true,
      });
      const diagnosticOptions = mqttService.connect.mock.calls.at(-1)?.[0];
      expect(diagnosticOptions).toMatchObject({ rejectUnauthorized: true });
      expect(diagnosticOptions?.checkServerIdentity).toBeTypeOf('function');

      mqttClient.emit('offline');
      await disconnected;
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

    it('routes a response without an envelope to the malformed-response event', async () => {
      const malformed = new Promise<{ requestId: string }>((resolve) => {
        eventEmitter.once(EVENT_QUERY_MALFORMED_RESPONSE, resolve);
      });
      mqttBrokerService.handleQueryResponseEvent({
        requestId,
        response: null,
      } as unknown as QueryResponse);
      await expect(malformed).resolves.toEqual({ requestId });
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
        mqttService.publish.mockImplementation((topic: string) => {
          res(topic);
          return {} as Promise<MqttPacket>;
        });
      });
      void mqttBrokerService.publishQuery({} as QueryRequest);

      expect(await promise).toBe(BROKER_TOPICS.QUERY_OUT);
    });

    it('does not log payloads by default', async () => {
      const verbose = vi.spyOn(Logger.prototype, 'verbose');
      await mqttBrokerService.publishQuery({
        requestId: 'request-id',
        res: 'persons',
        uuid: 'entity-id',
      });

      expect(verbose).not.toHaveBeenCalled();
    });
  });

  describe('publishPageQuery()', () => {
    it('should publish to BROKER_TOPICS.QUERY_OUT', async () => {
      const promise = new Promise<string>((res) => {
        mqttService.publish.mockImplementation((topic: string) => {
          res(topic);
          return {} as Promise<MqttPacket>;
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
        mqttService.publish.mockImplementation((topic: string) => {
          res(topic);
          return {} as Promise<MqttPacket>;
        });
      });
      void mqttBrokerService.publishCQRSCommand({
        type: type,
      } as CommandRequest);

      expect(await promise).toBe(`${BROKER_TOPIC_PREFIXES.CMD}/${type}`);
    });
  });

  const mockConnect = async () => {
    await mqttBrokerService.connect({
      host: '',
      port: 0,
      token: '',
      protocol: 'mqtts',
      clientId: '',
    });
  };
});
