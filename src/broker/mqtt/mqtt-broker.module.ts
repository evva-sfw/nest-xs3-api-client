import { Global, Module } from '@nestjs/common';
import { MqttBrokerService } from './mqtt-broker.service';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './mqtt-broker.module-definition';
import { MqttModule, MqttModuleOptions } from '@evva/nest-mqtt';
import { MqttBrokerModuleOptions } from './mqtt-broker.module-options';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Global()
@Module({
  imports: [
    MqttModule.forRootAsync({
      imports: [EventEmitterModule.forRoot()],
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: MqttBrokerModuleOptions) => {
        return {
          host: options.host,
          port: options.port,
          cert: options.cert,
          ca: options.certCA,
          key: options.key,
          protocol: 'mqtts',
          rejectUnauthorized: false,
          topicResolver: (varname: string) => {
            switch (varname) {
              case 'userId':
                return options.userId;
              default:
                throw new Error(`Unsupported topic variable: ${varname}`);
            }
          },
        } as any as MqttModuleOptions;
      },
    }),
  ],
  providers: [MqttBrokerService],
  exports: [MqttBrokerService, MODULE_OPTIONS_TOKEN],
})
export class MqttBrokerModule extends ConfigurableModuleClass {}
