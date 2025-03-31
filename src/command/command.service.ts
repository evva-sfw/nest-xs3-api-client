import {
  EVENT_CQRS_REQUEST,
  EVENT_CQRS_RESPONSE,
} from '../broker/broker.events';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { Command } from './command.type';
import { Payload } from '@evva/nest-mqtt';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class CommandService {
  private readonly logger = new Logger('CommandService');

  private resolver: (value: void | PromiseLike<void>) => void;

  constructor(
    private readonly mqttBrokerService: MqttBrokerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Assigns an authorization profile to a medium.
   *
   * @param {string} profileId
   * @param {string} mediumId
   * @returns {void}
   */
  async assignAuthorizationProfileToMedium(
    profileId: string,
    mediumId: string,
  ): Promise<void> {
    if (!this.mqttBrokerService.isConnected()) {
      this.logger.error('Command failed: not connected to broker');
      return null;
    }
    return new Promise((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        type: 'AssignAuthorizationProfileToMediumMapi',
        data: {
          authorizationProfileId: profileId,
          id: mediumId,
        },
      } as Command);
    });
  }

  /**
   * Assigns a person to a medium.
   *
   * @param {string} personId
   * @param {string} mediumId
   * @returns {void}
   */
  async assignPersonToMedium(
    personId: string,
    mediumId: string,
  ): Promise<void> {
    if (!this.mqttBrokerService.isConnected()) {
      this.logger.error('Command failed: not connected to broker');
      return null;
    }
    return new Promise((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        type: 'AssignPersonToMediumMapi',
        data: {
          personId: personId,
          id: mediumId,
        },
      } as Command);
    });
  }

  /**
   * Perform a remote disengage.
   *
   * @param {string} installationPointId
   * @param {boolean} extended
   * @returns {void}
   */
  async remoteDisengage(
    installationPointId: string,
    extended: boolean,
  ): Promise<void> {
    if (!this.mqttBrokerService.isConnected()) {
      this.logger.error('Command failed: not connected to broker');
      return null;
    }
    return new Promise((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        type: 'RemoteDisengage',
        data: {
          installationPointId: installationPointId,
          extended: extended,
        },
      } as Command);
    });
  }

  /**
   * Perform a remote permanent disengage.
   *
   * @param {string} installationPointId
   * @param {boolean} enable
   * @returns {void}
   */
  async remoteDisengagePermanent(
    installationPointId: string,
    enable: boolean,
  ): Promise<void> {
    if (!this.mqttBrokerService.isConnected()) {
      this.logger.error('Command failed: not connected to broker');
      return null;
    }
    return new Promise((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        type: 'RemoteDisengagePermanent',
        data: {
          installationPointId: installationPointId,
          enable: enable,
        },
      } as Command);
    });
  }

  /**
   * Event handler for new command responses from broker.
   *
   * @param {any} response
   * @protected
   */
  @OnEvent(EVENT_CQRS_RESPONSE)
  protected onCommandResponse(@Payload() response: any) {
    if (this.resolver) {
      this.resolver();
      this.resolver = null;
    }
  }
}
