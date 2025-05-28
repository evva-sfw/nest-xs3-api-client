import { MqttConnectOptions } from '@evva/nest-mqtt';

export interface MqttBrokerConnectOptions extends MqttConnectOptions {
  /**
   * MQTT client id
   */
  clientId: string;

  /**
   * MQTT session token
   */
  token: string;
}
