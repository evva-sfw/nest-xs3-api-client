export type Command =
  | 'Login'
  | 'Logout'
  | 'RemoteDisengage'
  | 'RemoteDisengagePermanent'
  | 'AssignAuthorizationProfileToMediumMapi'
  | 'AssignPersonToMediumMapi'
  | 'ConfigureRelaisBoard';

export type CommandRequest = {
  type: Command;
  data: CommandData;
};

export type CommandResponse = {
  commandId: string;
};

export type CommandResolver = (
  value: CommandResponse | PromiseLike<CommandResponse>,
) => void;

export type CommandData = CommandDataCQRS | CommandDataRelaisBoard;

export type CommandDataCQRS = object;

export type CommandDataRelaisBoard = {
  rb: string;
  config: CommandDataRelaisBoardConfig;
};

export type CommandDataRelaisBoardConfig =
  | CommandDataRelaisBoardConfigSetup
  | CommandDataRelaisBoardConfigCommand;

export type CommandDataRelaisBoardConfigSetup = {
  t: 'c';
  o: CommandDataRelaisBoardConfigSetupData[];
  i?: { gpio: number };
};

export type CommandDataRelaisBoardConfigSetupData = {
  gpio: number;
  on: 'low' | 'high';
};

export type CommandDataRelaisBoardConfigCommand = {
  t: 'o';
  o: number;
  timeout?: number;
};
