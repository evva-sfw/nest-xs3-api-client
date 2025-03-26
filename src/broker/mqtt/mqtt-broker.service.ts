import { Injectable, Logger } from '@nestjs/common';
import { MqttService, Payload, Subscribe } from '@evva/nest-mqtt';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { Broker } from '../broker.interface';
import {
  BROKER_TOPIC_PREFIXES,
  BROKER_TOPIC_SUFFIXES,
  BROKER_TOPICS,
} from './mqtt-broker.constants';
import {
  EVENT_ACCESS_PROTOCOL_RECEIVED,
  EVENT_CQRS_RECEIVED,
  EVENT_QUERY_RESOURCE_PAGED,
  EVENT_QUERY_RESOURCE_SINGLE,
  EVENT_USER_INFO_RECEIVED,
} from '../broker.events';
import { Query, QueryPaged } from '../../common/query';

@Injectable()
export class MqttBrokerService implements Broker {
  private readonly logger = new Logger('MqttBrokerService');

  constructor(
    private readonly mqttService: MqttService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Subscription handler for CQRS events.
   *
   * @param payload
   * @private
   */
  @Subscribe(BROKER_TOPICS.CQRS_EVENTS)
  handleCQRSEvent(@Payload() payload: any) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPICS.CQRS_EVENTS}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    this.eventEmitter.emit(EVENT_CQRS_RECEIVED, payload);
  }

  /**
   * Subscription handler for access protocol events.
   *
   * @param payload
   * @private
   */
  @Subscribe(BROKER_TOPICS.ACCESS_PROTOCOL)
  handleAccessProtocolEvent(@Payload() payload: any) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPICS.ACCESS_PROTOCOL}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    this.eventEmitter.emit(EVENT_ACCESS_PROTOCOL_RECEIVED, payload);
  }

  /**
   * Subscription handler for user events.
   *
   * @param payload
   * @private
   */
  @Subscribe(
    `${BROKER_TOPIC_PREFIXES.BASE}/{userId}/${BROKER_TOPIC_SUFFIXES.QUERY_IN}`,
  )
  handleUserEvent(@Payload() payload: any) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPIC_PREFIXES.BASE}/{userId}/${BROKER_TOPIC_SUFFIXES.QUERY_IN}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    this.eventEmitter.emit(EVENT_USER_INFO_RECEIVED, payload);
  }

  /**
   * Publishes a single resource query to the broker.
   *
   * @param {Query} payload
   * @private
   */
  @OnEvent(EVENT_QUERY_RESOURCE_SINGLE)
  async publishQuery(payload: Query) {
    try {
      const data = JSON.stringify({
        requestId: uuidv4(),
        resource: payload.res,
        id: payload.uuid,
        token: payload.token,
      });
      await this.mqttService.publish(BROKER_TOPICS.QUERY_OUT, data);
      this.logger.debug(
        `Message published\n\ttopic: ${BROKER_TOPICS.QUERY_OUT}\n\tdata: ${data}`,
      );
    } catch (err) {
      this.logger.error(`Failed to publish single query: ${err}`);
    }
  }

  /**
   * Publishes a paginated resource query to the broker.
   *
   * @param {QueryPaged} payload
   * @private
   */
  @OnEvent(EVENT_QUERY_RESOURCE_PAGED)
  async publishPageQuery(payload: QueryPaged) {
    try {
      const data = JSON.stringify({
        token: payload.token,
        requestId: payload.uuid || uuidv4(),
        resource: payload.res,
        params: {
          pageOffset: payload.offset || 0,
          pageLimit: payload.limit || 1,
          filters: payload.filters,
        },
      });
      await this.mqttService.publish(BROKER_TOPICS.QUERY_OUT, data);
      this.logger.debug(
        `Message published\n\ttopic: ${BROKER_TOPICS.QUERY_OUT}\n\tdata: ${data}`,
      );
    } catch (err) {
      this.logger.error(`Failed to publish page query: ${err}`);
    }
  }
}
