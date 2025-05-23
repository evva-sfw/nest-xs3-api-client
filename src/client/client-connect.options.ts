import { MqttBrokerConnectOptions } from '../broker/mqtt/mqtt-broker-connect.options';

export type ClientConnectOptions =
  MqttBrokerConnectOptions /* & SecondModuleOptions & ThirdModuleOptions */;
