import { MqttBrokerModule } from '../broker/mqtt/mqtt-broker.module';
import { CommandModule } from '../command/command.module';
import { QueryModule } from '../query/query.module';
import { ClientService } from './client.service';
import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MqttBrokerModule,
    QueryModule,
    CommandModule,
  ],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
