import {
  EVENT_CQRS_REQUEST,
  EVENT_CQRS_RESPONSE,
} from '../broker/broker.constants';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { CommandService } from './command.service';
import { InjectionToken } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { MockMetadata, ModuleMocker } from 'jest-mock';

const moduleMocker = new ModuleMocker(global);

describe('CommandService', () => {
  let moduleRef: TestingModule;
  let commandService: CommandService;
  let mqttBrokerService: MqttBrokerService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [CommandService],
    })
      .useMocker(mockFactory)
      .compile();

    await moduleRef.init();

    eventEmitter = await moduleRef.resolve(EventEmitter2);
    commandService = await moduleRef.resolve(CommandService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('cqrs()', () => {
    // Arguments
    const commandId = '968b8708-9504-4552-8fff-71ceaabafdb9';
    const type = 'RemoteDisengage';
    const data = {
      installationPointId: 'a7691e53-4c35-44f1-b3e1-cc77f48be4fc',
      commandId,
    };

    it('should throw on no connection', async () => {
      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => false);

      await expect(commandService.cqrs(type, data)).rejects.toThrow();
    });

    it('should emit EVENT_CQRS_REQUEST', async () => {
      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      const asyncEvent = new Promise<boolean>((resolve) => {
        eventEmitter.on(EVENT_CQRS_REQUEST, () => {
          resolve(true);
        });
      });
      void commandService.cqrs(type, data);
      const result = await asyncEvent;

      expect(result).toBeTruthy();
    });

    it('should return command response', async () => {
      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      eventEmitter.on(EVENT_CQRS_REQUEST, () => {
        eventEmitter.emit(EVENT_CQRS_RESPONSE, {
          commandId: commandId,
        });
      });
      const result = await commandService.cqrs(type, data);

      expect(result?.commandId).toBe(commandId);
    });
  });

  const mockFactory = (token: InjectionToken) => {
    if (typeof token === 'function') {
      const mockMetadata = moduleMocker.getMetadata(
        token,
      ) as MockMetadata<any, any>;
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
