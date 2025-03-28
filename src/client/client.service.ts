import { QueryService } from '../query/query.service';
import { Query, QueryPaged } from '../query/query.type';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ClientService {
  private readonly logger = new Logger('ClientService');

  constructor(private readonly queryService: QueryService) {}

  async query(q: Query) {
    return this.queryService.query(q);
  }

  async queryPaged(q: QueryPaged) {
    return this.queryService.queryPaged(q);
  }
}
