import { CommandService } from '../command/command.service';
import { QueryService } from '../query/query.service';
import { Query, QueryPaged } from '../query/query.type';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ClientService {
  private readonly logger = new Logger('ClientService');

  constructor(
    private readonly queryService: QueryService,
    private readonly commandService: CommandService,
  ) {}

  async query(q: Query) {
    return this.queryService.query(q);
  }

  async queryPaged(q: QueryPaged) {
    return this.queryService.queryPaged(q);
  }

  async assignAuthorizationProfileToMediumCommand(
    profileId: string,
    mediumId: string,
  ) {
    return this.commandService.assignAuthorizationProfileToMedium(
      profileId,
      mediumId,
    );
  }

  async assignPersonToMediumCommand(personId: string, mediumId: string) {
    return this.commandService.assignPersonToMedium(personId, mediumId);
  }

  async remoteDisengageCommand(installationPointId: string, extended: boolean) {
    return this.commandService.remoteDisengage(installationPointId, extended);
  }

  async remoteDisengagePermanentCommand(
    installationPointId: string,
    enable: boolean,
  ) {
    return this.commandService.remoteDisengagePermanent(
      installationPointId,
      enable,
    );
  }
}
