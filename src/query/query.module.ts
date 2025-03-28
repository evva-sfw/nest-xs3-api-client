import { QueryService } from './query.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [],
  providers: [QueryService],
  exports: [QueryService],
})
export class QueryModule {}
