export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
}
