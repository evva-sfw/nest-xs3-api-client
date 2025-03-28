import { Resource } from './resource';

export type Request = {
  requestId: string;
};

export type Query = {
  res: Resource;
  uuid: string;
};

export type QueryPaged = {
  res: Resource;
  offset?: number;
  limit?: number;
  filters?: QueryPagedFilter[];
};

export type QueryPagedFilter = {
  type: string;
  field: string;
  value: any;
};

export type QueryPageRequest = {
  pageOffset: number;
  pageLimit: number;
};

export type QueryRequest = Query & Request;

export type QueryPagedRequest = QueryPaged & Request;

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

export type QueryResolver = (
  value:
    | (QueryResponse | PromiseLike<QueryResponse>)
    | (QueryPagedResponse[] | PromiseLike<QueryPagedResponse[]>),
) => void;

export type QueryPageHandler = (response: QueryPagedResponse) => void;

export type QueryTable = {
  resolver: QueryResolver;
  resource?: Resource;
  filters?: [];
  autoPaginate?: boolean;
  pageHandlers?: QueryPageHandler[];
  pageRequests?: QueryPageRequest[];
  pageOne?: boolean;
  result?: QueryPagedResponse[];
};
