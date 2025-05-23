import { MqttBrokerService } from './mqtt-broker.service';
import { MqttModule } from '@evva/nest-mqtt';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [MqttModule],
  providers: [MqttBrokerService],
  exports: [MqttBrokerService],
})
export class MqttBrokerModule {}
