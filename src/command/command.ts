export type Command = CommandCQRS | CommandRelais;

export type CommandCQRS =
  | 'AddEntityMetadataDefinitionMapi'
  | 'AddEvvaComponentMapi'
  | 'AddInstallationPointAuthorizationToMediumMapi'
  | 'AddInstallationPointToZoneMapi'
  | 'AddSmartphoneToInstallationMapi'
  | 'AddZoneAuthorizationToMediumMapi'
  | 'AssignAuthorizationProfileToMediumMapi'
  | 'AssignPersonToMediumMapi'
  | 'ChangeAuthorizationProfileMapi'
  | 'ChangeAuthorizationProfileMetadataValueMapi'
  | 'ChangeAuthorizationTimeProfileMapi'
  | 'ChangeCalendarMapi'
  | 'ChangeCodingStationMapi'
  | 'ChangeInstallationPointMapi'
  | 'ChangeInstallationPointMetadataValueMapi'
  | 'ChangeMediumMetadataValueMapi'
  | 'ChangeOfficeModeTimeProfileMapi'
  | 'ChangePersonInformationMapi'
  | 'ChangePersonMetadataValueMapi'
  | 'ChangeZoneDataMapi'
  | 'ChangeZoneMetadataValueMapi'
  | 'ConfigureAssignableAuthorizationProfilesMapi'
  | 'ConfigureBluetoothStateMapi'
  | 'ConfigureManualOfficeModeAndShopModeMapi'
  | 'ConfigureMediaUpgradeMapi'
  | 'ConfigureOfficeModeTimeProfileMapi'
  | 'ConfigureReleaseDurationMapi'
  | 'CreateAuthorizationProfileMapi'
  | 'CreateAuthorizationTimeProfileMapi'
  | 'CreateCalendarMapi'
  | 'CreateCodingStationMapi'
  | 'CreateInstallationPointMapi'
  | 'CreateOfficeModeTimeProfileMapi'
  | 'CreatePersonMapi'
  | 'CreateZoneMapi'
  | 'DeleteAuthorizationProfileMapi'
  | 'DeleteAuthorizationTimeProfileMapi'
  | 'DeleteCalendarMapi'
  | 'DeleteCodingStationMapi'
  | 'DeleteEntityMetadataDefinitionMapi'
  | 'DeleteOfficeModeTimeProfileMapi'
  | 'DeletePersonMapi'
  | 'DeleteZoneMapi'
  | 'FindComponent'
  | 'ForceRemoveEvvaComponentMapi'
  | 'LockMediumMapi'
  | 'Login'
  | 'Logout'
  | 'PrepareRemovalOfEvvaComponentMapi'
  | 'RemoteDisengage'
  | 'RemoteDisengagePermanent'
  | 'RemoveInstallationPointAuthorizationFromMediumMapi'
  | 'RemoveInstallationPointFromZoneMapi'
  | 'RemoveZoneAuthorizationFromMediumMapi'
  | 'RenameEntityMetadataDefinitionMapi'
  | 'RequestAddMediumToInstallationMapi'
  | 'RequestNewRegistrationCodeMapi'
  | 'ResendSmartphoneAuthorizationsMapi'
  | 'RevertPrepareRemovalOfEvvaComponentMapi'
  | 'RevokeSmartphoneMapi'
  | 'SetAccessBeginAtMapi'
  | 'SetAccessEndAtMapi'
  | 'SetDailySchedulerExecutionTimeMapi'
  | 'SetDefaultAuthorizationProfileForPersonMapi'
  | 'SetDefaultDisengagePeriodForPersonMapi'
  | 'SetDefaultSmartphoneValidityDurationMapi'
  | 'SetDefaultValidityDurationMapi'
  | 'SetDisengagePeriodOnMediumMapi'
  | 'SetInstallationPointPersonalReferenceDurationMapi'
  | 'SetLabelOnMediumMapi'
  | 'SetMessageLanguageOnSmartphoneMapi'
  | 'SetMobileServiceModeMapi'
  | 'SetPersonPersonalReferenceDurationMapi'
  | 'SetPersonalReferenceDurationForInstallationPointMapi'
  | 'SetPersonalReferenceDurationInPersonMapi'
  | 'SetPhoneNumberOnSmartphoneMapi'
  | 'SetReplacementMediumDurationMapi'
  | 'SetValidityDurationMapi'
  | 'SetValidityThresholdMapi'
  | 'UnassignPersonFromMediumMapi'
  | 'UnregisterSmartphoneMapi'
  | 'WithdrawAuthorizationProfileFromMediumMapi';

export type CommandRelais = 'ConfigureRelaisBoard';

export type CommandRequest = {
  type: Command;
  data: CommandData;
  commandId?: string;
};

export type CommandResponse = {
  commandId: string;
  correlationId: string;
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
