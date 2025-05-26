import {
  EVENT_CQRS_REQUEST,
  EVENT_CQRS_RESPONSE,
} from '../broker/broker.events';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { CommandService } from './command.service';
import { InjectionToken } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';

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

  describe('assignAuthorizationProfileToMedium()', () => {
    // Arguments
    const profileId = '7950ed5a-ddc1-4033-ac11-3487dac8cf3b';
    const mediumId = '6087c4c8-1125-4af8-8d1d-d8d287406f98';

    it('should throw on no connection', async () => {
      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => false);

      await expect(
        commandService.assignAuthorizationProfileToMedium(profileId, mediumId),
      ).rejects.toThrow();
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
      void commandService.assignAuthorizationProfileToMedium(
        profileId,
        mediumId,
      );
      const result = await asyncEvent;

      expect(result).toBeTruthy();
    });

    it('should return command response', async () => {
      const commandId = '968b8708-9504-4552-8fff-71ceaabafdb9';

      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      eventEmitter.on(EVENT_CQRS_REQUEST, () => {
        eventEmitter.emit(EVENT_CQRS_RESPONSE, {
          commandId: commandId,
        });
      });
      const result = await commandService.assignAuthorizationProfileToMedium(
        profileId,
        mediumId,
      );

      expect(result?.commandId).toBe(commandId);
    });
  });

  describe('assignPersonToMedium()', () => {
    // Arguments
    const personId = '7950ed5a-ddc1-4033-ac11-3487dac8cf3b';
    const mediumId = '6087c4c8-1125-4af8-8d1d-d8d287406f98';

    it('should throw on no connection', async () => {
      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => false);

      await expect(
        commandService.assignPersonToMedium(personId, mediumId),
      ).rejects.toThrow();
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
      void commandService.assignPersonToMedium(personId, mediumId);
      const result = await asyncEvent;

      expect(result).toBeTruthy();
    });

    it('should return command response', async () => {
      const commandId = '968b8708-9504-4552-8fff-71ceaabafdb9';

      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      eventEmitter.on(EVENT_CQRS_REQUEST, () => {
        eventEmitter.emit(EVENT_CQRS_RESPONSE, {
          commandId: commandId,
        });
      });
      const result = await commandService.assignPersonToMedium(
        personId,
        mediumId,
      );

      expect(result?.commandId).toBe(commandId);
    });
  });

  describe('remoteDisengage()', () => {
    // Arguments
    const installationPointId = '7950ed5a-ddc1-4033-ac11-3487dac8cf3b';

    it('should throw on no connection', async () => {
      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => false);

      await expect(
        commandService.remoteDisengage(installationPointId, true),
      ).rejects.toThrow();
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
      void commandService.remoteDisengage(installationPointId, true);
      const result = await asyncEvent;

      expect(result).toBeTruthy();
    });

    it('should return command response', async () => {
      const commandId = '968b8708-9504-4552-8fff-71ceaabafdb9';

      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      eventEmitter.on(EVENT_CQRS_REQUEST, () => {
        eventEmitter.emit(EVENT_CQRS_RESPONSE, {
          commandId: commandId,
        });
      });
      const result = await commandService.remoteDisengage(
        installationPointId,
        true,
      );

      expect(result?.commandId).toBe(commandId);
    });
  });

  describe('remoteDisengagePermanent()', () => {
    // Arguments
    const installationPointId = '7950ed5a-ddc1-4033-ac11-3487dac8cf3b';

    it('should throw on no connection', async () => {
      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => false);

      await expect(
        commandService.remoteDisengagePermanent(installationPointId, true),
      ).rejects.toThrow();
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
      void commandService.remoteDisengagePermanent(installationPointId, true);
      const result = await asyncEvent;

      expect(result).toBeTruthy();
    });

    it('should return command response', async () => {
      const commandId = '968b8708-9504-4552-8fff-71ceaabafdb9';

      jest
        .spyOn(mqttBrokerService, 'isConnected')
        .mockImplementation(() => true);

      eventEmitter.on(EVENT_CQRS_REQUEST, () => {
        eventEmitter.emit(EVENT_CQRS_RESPONSE, {
          commandId: commandId,
        });
      });
      const result = await commandService.remoteDisengagePermanent(
        installationPointId,
        true,
      );

      expect(result?.commandId).toBe(commandId);
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
