import { ResourceType } from './resource';

export type Query = {
  res: ResourceType;
  token: string;
  uuid: string;
};

export type QueryPaged = {
  res: ResourceType;
  token: string;
  offset?: number;
  limit?: number;
  filters?: string;
  uuid?: string;
};
