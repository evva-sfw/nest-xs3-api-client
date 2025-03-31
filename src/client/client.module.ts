import { MqttBrokerModule } from '../broker/mqtt/mqtt-broker.module';
import { CommandModule } from '../command/command.module';
import { QueryModule } from '../query/query.module';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './client.module-definition';
import { ClientModuleOptions } from './client.module-options';
import { ClientService } from './client.service';
import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
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
    QueryModule,
    CommandModule,
  ],
  providers: [ClientService],
  exports: [ClientService, MODULE_OPTIONS_TOKEN],
})
export class ClientModule extends ConfigurableModuleClass {}
