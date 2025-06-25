import { CommandDataRelaisBoard, CommandRequest } from '../../command/command';
import {
  QueryPagedRequest,
  QueryPagedResponse,
  QueryRequest,
  QueryResponse,
} from '../../query/query.type';
import {
  EVENT_ACCESS_PROTOCOL_RECEIVED,
  EVENT_CQRS_REQUEST,
  EVENT_CQRS_RESPONSE,
  EVENT_ERROR_RESPONSE,
  EVENT_QUERY_PAGED_REQUEST,
  EVENT_QUERY_PAGED_RESPONSE,
  EVENT_QUERY_SINGLE_REQUEST,
  EVENT_QUERY_SINGLE_RESPONSE,
  EVENT_RB_REQUEST,
  EVENT_RB_RESPONSE,
} from '../broker.constants';
import { Broker } from '../broker.interface';
import { MqttBrokerConnectOptions } from './mqtt-broker-connect.options';
import {
  BROKER_TOPIC_PREFIXES,
  BROKER_TOPIC_SUFFIXES,
  BROKER_TOPICS,
} from './mqtt-broker.constants';
import { MqttService, Payload, Subscribe } from '@evva/nest-mqtt';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MqttBrokerService implements Broker {
  private readonly logger = new Logger('MqttBrokerService');
  private options: MqttBrokerConnectOptions;

  constructor(
    private readonly mqttService: MqttService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Connects to the MQTT broker.
   *
   * @param {MqttBrokerConnectOptions} options
   * @throws
   */
  public async connect(options: MqttBrokerConnectOptions) {
    this.options = options;

    await this.mqttService.connect({
      host: options.host,
      port: options.port,
      cert: options.cert,
      ca: options.ca,
      key: options.key,
      protocol: 'mqtts',
      rejectUnauthorized: false,
      autoSubscribe: true,
      clean: true,
      topicResolver: (varname: string) => {
        switch (varname) {
          case 'userId':
            return options.clientId;
          default:
            throw new Error(`Unsupported topic variable: ${varname}`);
        }
      },
    });
  }

  /**
   * Disconnects from the MQTT broker.
   *
   * @throws
   */
  public async disconnect() {
    return this.mqttService.disconnect();
  }

  /**
   * Returns if the current client is connected.
   *
   * @returns {boolean}
   */
  public isConnected(): boolean {
    return this.mqttService.getClient()?.connected || false;
  }

  /**
   * Subscription handler for CQRS events.
   *
   * @param {object} payload
   * @private
   */
  @Subscribe(BROKER_TOPICS.CQRS_EVENTS)
  public handleCQRSEvent(@Payload() payload: object) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPICS.CQRS_EVENTS}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    this.eventEmitter.emit(EVENT_CQRS_RESPONSE, payload);
  }

  /**
   * Subscription handler for access protocol events.
   *
   * @param {object} payload
   * @private
   */
  @Subscribe(BROKER_TOPICS.ACCESS_PROTOCOL)
  public handleAccessProtocolEvent(@Payload() payload: object) {
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
  public handleQueryResponseEvent(
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
   * Subscription handler for query error responses.
   *
   * @param {object} payload
   * @private
   */
  @Subscribe(
    `${BROKER_TOPIC_PREFIXES.BASE}/{userId}/${BROKER_TOPIC_SUFFIXES.ERROR_IN}`,
  )
  public handleQueryErrorEvent(@Payload() payload: any) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPIC_PREFIXES.BASE}/{userId}/${BROKER_TOPIC_SUFFIXES.ERROR_IN}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    this.eventEmitter.emit(EVENT_ERROR_RESPONSE, payload);
  }

  /**
   * Subscription handler for relais board responses.
   *
   * @param {object} payload
   * @private
   */
  @Subscribe(`${BROKER_TOPICS.RB_DIAG}`)
  public handleRelaisBoardCommandEvent(@Payload() payload: any) {
    this.logger.verbose(
      `Message received\n\ttopic: ${BROKER_TOPICS.RB_DIAG}\n\tdata: ${payload ? JSON.stringify(payload) : null}`,
    );
    this.eventEmitter.emit(EVENT_RB_RESPONSE, payload);
  }

  /**
   * Publishes a single resource query to the broker.
   *
   * @param {QueryRequest} request
   */
  @OnEvent(EVENT_QUERY_SINGLE_REQUEST, { async: true })
  public async publishQuery(request: QueryRequest) {
    try {
      const data = {
        token: this.options.token,
        requestId: request.requestId,
        resource: request.res,
        id: request.uuid,
      };
      const dataStr = JSON.stringify(data);

      await this.mqttService.publish(BROKER_TOPICS.QUERY_OUT, dataStr);

      this.logger.verbose(
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
  @OnEvent(EVENT_QUERY_PAGED_REQUEST, { async: true })
  public async publishPageQuery(request: QueryPagedRequest) {
    try {
      const data = {
        token: this.options.token,
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
   * @param {CommandRequest} request
   */
  @OnEvent(EVENT_CQRS_REQUEST, { async: true })
  public async publishCQRSCommand(request: CommandRequest) {
    try {
      const topic = `${BROKER_TOPIC_PREFIXES.CMD}/${request.type}`;
      const data = {
        token: this.options.token,
        commandId: request.commandId,
        ...request.data,
      };
      const dataStr = JSON.stringify(data);

      await this.mqttService.publish(topic, dataStr);

      this.logger.verbose(
        `Message published\n\ttopic: ${topic}\n\tdata: ${dataStr}`,
      );
    } catch (err) {
      this.logger.error(`Failed to publish command: ${err}`);
    }
  }

  /**
   * Publishes an RB command to the broker.
   *
   * @param {CommandRequest} request
   */
  @OnEvent(EVENT_RB_REQUEST, { async: true })
  public async publishRelaisBoardCommand(request: CommandRequest) {
    try {
      const topic = `${BROKER_TOPIC_PREFIXES.RB}/${(request.data as CommandDataRelaisBoard).rb}/do`;
      const dataStr = JSON.stringify(
        (request.data as CommandDataRelaisBoard).config,
      );

      await this.mqttService.publish(topic, dataStr);
      this.eventEmitter.emit(EVENT_RB_RESPONSE, null);

      this.logger.verbose(
        `Message published\n\ttopic: ${topic}\n\tdata: ${dataStr}`,
      );
    } catch (err) {
      this.logger.error(`Failed to publish command: ${err}`);
    }
  }
}
