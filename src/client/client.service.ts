import { Query, QueryPaged } from '../common/query';
import { QueryService } from '../query/query.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ClientService {
  private readonly logger = new Logger('ClientService');

  constructor(private readonly queryService: QueryService) {}

  async query(q: Query) {
    return this.queryService.querySingle(q);
  }

  async queryPaged(q: QueryPaged) {
    return this.queryService.queryPaged(q);
  }
}
