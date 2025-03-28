import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './mqtt-broker.module-definition';
import { MqttBrokerModuleOptions } from './mqtt-broker.module-options';
import { MqttBrokerService } from './mqtt-broker.service';
import { MqttModule, MqttModuleOptions } from '@evva/nest-mqtt';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [
    MqttModule.forRootAsync({
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: MqttBrokerModuleOptions) => {
        return {
          host: options.host,
          port: options.port,
          cert: options.cert,
          ca: options.certCA,
          key: options.key,
          protocol: 'mqtts',
          clientId: options.clientId,
          rejectUnauthorized: false,
          clean: true,
          topicResolver: (varname: string) => {
            switch (varname) {
              case 'userId':
                return options.clientId;
              default:
                throw new Error(`Unsupported topic variable: ${varname}`);
            }
          },
        } as MqttModuleOptions;
      },
    }),
  ],
  providers: [MqttBrokerService],
  exports: [MqttBrokerService, MODULE_OPTIONS_TOKEN],
})
export class MqttBrokerModule extends ConfigurableModuleClass {}
