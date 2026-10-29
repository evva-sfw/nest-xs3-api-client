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

  /**
   * Enables MQTT payload logging. Disabled by default because payloads may contain
   * session tokens or sensitive Xesar data.
   */
  logPayloads?: boolean;

  /**
   * Skips TLS broker-hostname verification while continuing to verify the certificate chain.
   * Use only temporarily when diagnosing a known broker certificate hostname mismatch.
   */
  skipHostnameVerification?: boolean;
}
