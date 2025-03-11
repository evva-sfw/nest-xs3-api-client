import { ConfigurableModuleBuilder } from '@nestjs/common';
import { ClientModuleOptions } from './client.module-options';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<ClientModuleOptions>()
    .setClassMethodName('forRoot')
    .build();
