import {
  EVENT_CQRS_REQUEST,
  EVENT_CQRS_RESPONSE,
} from '../broker/broker.events';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { CommandRequest, CommandResolver, CommandResponse } from './command';
import { Payload } from '@evva/nest-mqtt';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class CommandService {
  private readonly logger = new Logger('CommandService');

  private resolver: CommandResolver;

  constructor(
    private readonly mqttBrokerService: MqttBrokerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Assigns an authorization profile to a medium.
   *
   * @param {string} profileId
   * @param {string} mediumId
   * @throws
   * @returns {CommandResponse}
   */
  async assignAuthorizationProfileToMedium(
    profileId: string,
    mediumId: string,
  ): Promise<CommandResponse> {
    if (!this.mqttBrokerService.isConnected()) {
      return Promise.reject(new Error('Query failed: not connected to broker'));
    }
    return new Promise<CommandResponse>((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        type: 'AssignAuthorizationProfileToMediumMapi',
        data: {
          authorizationProfileId: profileId,
          id: mediumId,
        },
      } as CommandRequest);
    });
  }

  /**
   * Assigns a person to a medium.
   *
   * @param {string} personId
   * @param {string} mediumId
   * @throws
   * @returns {CommandResponse}
   */
  async assignPersonToMedium(
    personId: string,
    mediumId: string,
  ): Promise<CommandResponse> {
    if (!this.mqttBrokerService.isConnected()) {
      return Promise.reject(new Error('Query failed: not connected to broker'));
    }
    return new Promise<CommandResponse>((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        type: 'AssignPersonToMediumMapi',
        data: {
          personId: personId,
          id: mediumId,
        },
      } as CommandRequest);
    });
  }

  /**
   * Perform a remote disengage.
   *
   * @param {string} installationPointId
   * @param {boolean} extended
   * @throws
   * @returns {CommandResponse}
   */
  async remoteDisengage(
    installationPointId: string,
    extended: boolean,
  ): Promise<CommandResponse> {
    if (!this.mqttBrokerService.isConnected()) {
      return Promise.reject(new Error('Query failed: not connected to broker'));
    }
    return new Promise<CommandResponse>((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        type: 'RemoteDisengage',
        data: {
          installationPointId: installationPointId,
          extended: extended,
        },
      } as CommandRequest);
    });
  }

  /**
   * Perform a remote permanent disengage.
   *
   * @param {string} installationPointId
   * @param {boolean} enable
   * @throws
   * @returns {CommandResponse}
   */
  async remoteDisengagePermanent(
    installationPointId: string,
    enable: boolean,
  ): Promise<CommandResponse> {
    if (!this.mqttBrokerService.isConnected()) {
      return Promise.reject(new Error('Query failed: not connected to broker'));
    }
    return new Promise<CommandResponse>((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        type: 'RemoteDisengagePermanent',
        data: {
          installationPointId: installationPointId,
          enable: enable,
        },
      } as CommandRequest);
    });
  }

  /**
   * Event handler for new command responses from broker.
   *
   * @param {any} response
   * @protected
   */
  @OnEvent(EVENT_CQRS_RESPONSE, { async: true })
  protected onCommandResponse(@Payload() response: CommandResponse) {
    if (this.resolver) {
      this.resolver(response);
      this.resolver = null;
    }
  }
}
