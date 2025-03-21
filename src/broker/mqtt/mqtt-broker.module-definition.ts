import { ConfigurableModuleBuilder } from '@nestjs/common';
import { MqttBrokerModuleOptions } from './mqtt-broker.module-options';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<MqttBrokerModuleOptions>()
    .setClassMethodName('forRoot')
    .build();
