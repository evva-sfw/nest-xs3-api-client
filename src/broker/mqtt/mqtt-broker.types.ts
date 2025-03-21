import { BROKER_RESOURCE } from './mqtt-broker.constants';

export type Query = {
  res: BROKER_RESOURCE;
  token: string;
  uuid: string;
};

export type QueryPaged = {
  res: BROKER_RESOURCE;
  token: string;
  offset?: number;
  limit?: number;
  filters?: string;
  uuid?: string;
};
