import {
  EVENT_CQRS_REQUEST,
  EVENT_CQRS_RESPONSE,
  EVENT_ERROR_RESPONSE,
  EVENT_RB_REQUEST,
  EVENT_RB_RESPONSE,
} from '../broker/broker.constants';
import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { HashMap } from '../common/interface';
import {
  CommandRequest,
  CommandResolver,
  CommandResponse,
  CommandCQRS,
  CommandRelais,
} from './command';
import { Payload } from '@evva/nest-mqtt';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CommandService {
  private cqrsRequests: HashMap<CommandResolver> = {};
  private rbRequest: CommandResolver;

  constructor(
    private readonly mqttBrokerService: MqttBrokerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Dispatches a CQRS command to the broker.
   *
   * @param {CommandCQRS} type
   * @param {HashMap<any>} data
   */
  async cqrs(type: CommandCQRS, data: HashMap<any>) {
    if (!this.mqttBrokerService.isConnected()) {
      throw new Error('Command failed: not connected to broker');
    }
    const commandId = (data.commandId as string) || uuidv4();

    return new Promise<CommandResponse>((resolver) => {
      this.cqrsRequests[commandId] = resolver;
      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
        commandId,
        type,
        data,
      } as CommandRequest);
    });
  }

  /**
   * Dispatches an RB command to the broker.
   *
   * @param {CommandRelais} type
   * @param {HashMap<any>} data
   */
  async rb(type: CommandRelais, data: HashMap<any>) {
    if (!this.mqttBrokerService.isConnected()) {
      throw new Error('Command failed: not connected to broker');
    }
    return new Promise<CommandResponse>((resolver) => {
      this.rbRequest = resolver;

      this.eventEmitter.emit(EVENT_RB_REQUEST, {
        type,
        data,
      } as CommandRequest);
    });
  }

  /**
   * Event handler for CQRS and error responses.
   *
   * @param {any} response
   * @protected
   */
  @OnEvent(EVENT_CQRS_RESPONSE, { async: true })
  @OnEvent(EVENT_ERROR_RESPONSE, { async: true })
  protected onCQRSResponse(@Payload() response: CommandResponse) {
    const id = response.commandId || response.correlationId;
    if (this.cqrsRequests[id]) {
      this.cqrsRequests[id](response);
      delete this.cqrsRequests[id];
    }
  }

  /**
   * Event handler for RB responses from broker.
   *
   * @param {any} response
   * @protected
   */
  @OnEvent(EVENT_RB_RESPONSE, { async: true })
  protected onRBResponse(@Payload() response: CommandResponse) {
    if (this.rbRequest) {
      this.rbRequest(response);
      this.rbRequest = null;
    }
  }
}
