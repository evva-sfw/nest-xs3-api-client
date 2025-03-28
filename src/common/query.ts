import { Resource } from './resource';

export type Query = {
  res: Resource;
  uuid: string;
};

export type QueryPaged = {
  res: Resource;
  offset?: number;
  limit?: number;
  filters?: QueryPagedFilter[];
  uuid?: string;
};

export type QueryPagedFilter = {
  type: string;
  field: string;
  value: any;
};

export type QueryResponse = {
  requestId: string;
  response: object;
};

export type QueryPagedResponse = {
  requestId: string;
  response: {
    data: object[];
    totalCount: number;
    filterCount: number;
  };
};

export type QueryPageRequest = {
  pageOffset: number;
  pageLimit: number;
};
