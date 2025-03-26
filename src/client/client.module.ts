import { Global, Module } from '@nestjs/common';
import { ClientService } from './client.service';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './client.module-definition';
import { ClientModuleOptions } from './client.module-options';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MqttBrokerModule } from '../broker/mqtt/mqtt-broker.module';

@Global()
@Module({
  imports: [
    MqttBrokerModule.forRootAsync({
      imports: [EventEmitterModule.forRoot()],
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: ClientModuleOptions) => {
        return {
          host: options.host,
          port: options.port,
          cert: options.cert,
          certCA: options.certCA,
          key: options.key,
          clientId: options.clientId,
          token: options.token,
        };
      },
    }),
  ],
  providers: [ClientService],
  exports: [ClientService, MODULE_OPTIONS_TOKEN],
})
export class ClientModule extends ConfigurableModuleClass {}
