import { MqttBrokerModuleOptions } from './mqtt-broker.module-options';
import { ConfigurableModuleBuilder } from '@nestjs/common';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<MqttBrokerModuleOptions>()
    .setClassMethodName('forRoot')
    .build();
