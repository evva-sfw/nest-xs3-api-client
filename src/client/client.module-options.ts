import { MqttBrokerModuleOptions } from '../broker/mqtt/mqtt-broker.module-options';

export type ClientModuleOptions =
  MqttBrokerModuleOptions /* & SecondModuleOptions & ThirdModuleOptions */;
