export interface MqttBrokerModuleOptions {
  /**
   * MQTT host
   */
  host: string;

  /**
   * MQTT port
   */
  port: number;

  /**
   * MQTT client cert
   */
  cert: string;

  /**
   * MQTT ca cert
   */
  certCA: string;

  /**
   * MQTT private key
   */
  key: string;

  /**
   * MQTT user id
   */
  userId: string;

  /**
   * MQTT session token
   */
  token: string;
}
