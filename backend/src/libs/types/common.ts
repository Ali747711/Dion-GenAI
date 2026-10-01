export type UUID = string;

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiList<T> {
  data: T[];
  nextCursor: string | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    retryable: boolean;
    fields?: Record<string, string>;
  };
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
