import { ClientModuleOptions } from './client.module-options';
import { ConfigurableModuleBuilder } from '@nestjs/common';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<ClientModuleOptions>()
    .setClassMethodName('forRoot')
    .build();
