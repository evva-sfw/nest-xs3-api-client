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

@Injectable()
export class CommandService {
  private resolver: CommandResolver;

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
    return new Promise<CommandResponse>((resolver) => {
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_CQRS_REQUEST, {
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
      this.resolver = resolver;

      this.eventEmitter.emit(EVENT_RB_REQUEST, {
        type,
        data,
      } as CommandRequest);
    });
  }

  /**
   * Event handler for new CQRS responses from broker.
   *
   * @param {any} response
   * @protected
   */
  @OnEvent(EVENT_CQRS_RESPONSE, { async: true })
  protected onCQRSResponse(@Payload() response: CommandResponse) {
    if (this.resolver) {
      this.resolver(response);
      this.resolver = null;
    }
  }

  /**
   * Event handler for new RB responses from broker.
   *
   * @param {any} response
   * @protected
   */
  @OnEvent(EVENT_RB_RESPONSE, { async: true })
  protected onRBResponse(@Payload() response: CommandResponse) {
    if (this.resolver) {
      this.resolver(response);
      this.resolver = null;
    }
  }

  /**
   * Event handler for error responses from broker.
   *
   * @param {any} response
   * @protected
   */
  @OnEvent(EVENT_ERROR_RESPONSE, { async: true })
  protected onErrorResponse(@Payload() response: CommandResponse) {
    if (this.resolver) {
      this.resolver(response);
      this.resolver = null;
    }
  }
}
