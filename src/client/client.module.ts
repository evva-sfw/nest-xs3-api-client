import { Global, Module } from '@nestjs/common';
import { ClientService } from './client.service';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './client.module-definition';

@Global()
@Module({
  providers: [ClientService],
  exports: [ClientService, MODULE_OPTIONS_TOKEN],
})
export class ClientModule extends ConfigurableModuleClass {}
