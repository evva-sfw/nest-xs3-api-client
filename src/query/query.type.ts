import { Resource } from '../common/resource';

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

export type QueryErrorResponse = {
  correlationId?: string;
  error: number;
  reason?: string | null;
};

export type QueryErrorCode =
  | 'permission'
  | 'validation'
  | 'not-found'
  | 'timeout'
  | 'upstream'
  | 'disconnected'
  | 'malformed-response';

export class QueryError extends Error {
  constructor(
    readonly code: QueryErrorCode,
    message: string,
    readonly correlationId?: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

export type QueryResolver = (
  value:
    | (QueryResponse | PromiseLike<QueryResponse>)
    | (QueryPagedResponse[] | PromiseLike<QueryPagedResponse[]>),
) => void;

export type QueryPageHandler = (response: QueryPagedResponse) => void;

export type QueryTable = {
  task: QueryResolver;
  kind?: 'single' | 'paged';
  reject?: (error: QueryError) => void;
  taskTimeout?: NodeJS.Timeout;
  autoPaginate?: boolean;
  pageHandlers?: QueryPageHandler[];
  pageRequests?: QueryPageRequest[];
  pageOne?: boolean;
  resource?: Resource;
  filters?: [];
  result?: QueryPagedResponse[];
};
