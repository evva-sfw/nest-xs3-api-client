export type Command =
  | 'Login'
  | 'Logout'
  | 'RemoteDisengage'
  | 'RemoteDisengagePermanent'
  | 'AssignAuthorizationProfileToMediumMapi'
  | 'AssignPersonToMediumMapi';

export type CommandRequest = {
  type: Command;
  data: object;
};

export type CommandResponse = {
  commandId: string;
};

export type CommandResolver = (
  value: CommandResponse | PromiseLike<CommandResponse>,
) => void;
