export type CommandType =
  | 'Login'
  | 'Logout'
  | 'RemoteDisengage'
  | 'RemoteDisengagePermanent'
  | 'AssignAuthorizationProfileToMediumMapi'
  | 'AssignPersonToMediumMapi';

export type Command = {
  type: CommandType;
  data: object;
};
