import { CommandService } from './command.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [],
  providers: [CommandService],
  exports: [CommandService],
})
export class CommandModule {}
