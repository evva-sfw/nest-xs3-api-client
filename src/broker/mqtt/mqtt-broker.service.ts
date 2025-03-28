import { MODULE_OPTIONS_TOKEN } from '../../client';
import { Command } from '../../command/command.type';
import {
  QueryPagedRequest,
  QueryPagedResponse,
  QueryRequest,
  QueryResponse,
} from '../../query/query.type';
import {
  EVENT_ACCESS_PROTOCOL_RECEIVED,
  EVENT_COMMAND_SEND,
  EVENT_CQRS_RECEIVED,
  EVENT_QUERY_PAGED_REQUEST,
  EVENT_QUERY_PAGED_RESPONSE,
  EVENT_QUERY_SINGLE_REQUEST,
  EVENT_QUERY_SINGLE_RESPONSE,
} from '../broker.events';
import { Broker } from '../broker.interface';
import {
  BROKER_TOPIC_PREFIXES,
  BROKER_TOPIC_SUFFIXES,
  BROKER_TOPICS,
} from './mqtt-broker.constants';
import { MqttBrokerModuleOptions } from './mqtt-broker.module-options';
import { MqttService, Payload, Subscribe } from '@evva/nest-mqtt';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MqttBrokerService implements Broker {
  private readonly logger = new Logger('MqttBrokerService');

  constructor(
    private readonly mqttService: MqttService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly moduleOptions: MqttBrokerModuleOptions,
  ) {}

  /**
   * Returns if the current client is connected.
   *
   * @returns {boolean}
   */
  isConnected(): boolean {
    return this.mqttService.getClient()?.connected || false;
  }

  /**
   * Subscription handler for CQRS events.
   *
   * @param {object} payload
   * @private
   */
  @Subscribe(BROKER_TOPICS.CQRS_EVENTS)
  handleCQRSEvent(@Payload() payload: object) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPICS.CQRS_EVENTS}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    this.eventEmitter.emit(EVENT_CQRS_RECEIVED, payload);
  }

  /**
   * Subscription handler for access protocol events.
   *
   * @param {object} payload
   * @private
   */
  @Subscribe(BROKER_TOPICS.ACCESS_PROTOCOL)
  handleAccessProtocolEvent(@Payload() payload: object) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPICS.ACCESS_PROTOCOL}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    this.eventEmitter.emit(EVENT_ACCESS_PROTOCOL_RECEIVED, payload);
  }

  /**
   * Subscription handler for query responses.
   *
   * @param {object} payload
   * @private
   */
  @Subscribe(
    `${BROKER_TOPIC_PREFIXES.BASE}/{userId}/${BROKER_TOPIC_SUFFIXES.QUERY_IN}`,
  )
  handleQueryResponseEvent(
    @Payload() payload: QueryResponse | QueryPagedResponse,
  ) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPIC_PREFIXES.BASE}/{userId}/${BROKER_TOPIC_SUFFIXES.QUERY_IN}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    if (payload.response.hasOwnProperty('totalCount')) {
      this.eventEmitter.emit(EVENT_QUERY_PAGED_RESPONSE, payload);
    } else {
      this.eventEmitter.emit(EVENT_QUERY_SINGLE_RESPONSE, payload);
    }
  }

  /**
   * Publishes a single resource query to the broker.
   *
   * @param {QueryRequest} request
   */
  @OnEvent(EVENT_QUERY_SINGLE_REQUEST)
  async publishQuery(request: QueryRequest) {
    try {
      const data = {
        token: this.moduleOptions.token,
        requestId: request.requestId,
        resource: request.res,
        id: request.uuid,
      };
      const dataStr = JSON.stringify(data);

      await this.mqttService.publish(BROKER_TOPICS.QUERY_OUT, dataStr);

      this.logger.debug(
        `Message published\n\ttopic: ${BROKER_TOPICS.QUERY_OUT}\n\tdata: ${dataStr}`,
      );
    } catch (err) {
      this.logger.error(`Failed to publish single query: ${err}`);
    }
  }

  /**
   * Publishes a paginated resource query to the broker.
   *
   * @param {QueryPagedRequest} request
   */
  @OnEvent(EVENT_QUERY_PAGED_REQUEST)
  async publishPageQuery(request: QueryPagedRequest) {
    try {
      const data = {
        token: this.moduleOptions.token,
        requestId: request.requestId,
        resource: request.res,
        params: {
          pageOffset: request.offset,
          pageLimit: request.limit,
          filters: request.filters,
        },
      };
      const dataStr = JSON.stringify(data);

      await this.mqttService.publish(BROKER_TOPICS.QUERY_OUT, dataStr);

      this.logger.verbose(
        `Message published\n\ttopic: ${BROKER_TOPICS.QUERY_OUT}\n\tdata: ${dataStr}`,
      );
    } catch (err) {
      this.logger.error(`Failed to publish page query: ${err}`);
    }
  }

  /**
   * Publishes a CQRS command to the broker.
   *
   * @param {Command} payload
   */
  @OnEvent(EVENT_COMMAND_SEND)
  async publishCommand(payload: Command) {
    try {
      await this.mqttService.publish(
        `${BROKER_TOPIC_PREFIXES.CMD}/${payload.type}`,
        payload.data,
      );
    } catch (err) {
      this.logger.error(`Failed to publish command: ${err}`);
    }
  }
}
