/**
 * Central application error type. Every service throws `AppError`; every
 * controller catches it and renders the API contract's error envelope:
 *   { error: { code, message, requestId, retryable, fields? } }
 */

export enum HttpCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  PARTIAL_CONTENT = 206,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  PAYLOAD_TOO_LARGE = 413,
  RANGE_NOT_SATISFIABLE = 416,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
}

/** Stable application error codes from API_CONTRACT.md. */
export enum ErrorCode {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  CSRF_INVALID = "CSRF_INVALID",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INSUFFICIENT_BUDGET = "INSUFFICIENT_BUDGET",
  CAPABILITY_UNAVAILABLE = "CAPABILITY_UNAVAILABLE",
  PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",
  RATE_LIMITED = "RATE_LIMITED",
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  INTERNAL = "INTERNAL",
}

export enum Message {
  SOMETHING_WENT_WRONG = "Something went wrong",
  VALIDATION_FAILED = "Request validation failed",
  NOT_AUTHENTICATED = "Authentication required",
  INVALID_CREDENTIALS = "Invalid password",
  CSRF_INVALID = "Missing or invalid CSRF token",
  NO_DATA_FOUND = "No data found",
  CONFLICT = "Request conflicts with current state",
  INSUFFICIENT_BUDGET = "Insufficient budget for this operation",
  CAPABILITY_UNAVAILABLE = "This capability is not available yet",
  PAYLOAD_TOO_LARGE = "Request body too large",
  RATE_LIMITED = "Too many requests, slow down",
  PROVIDER_UNAVAILABLE = "Upstream provider is unavailable",
}

const CODE_HTTP_STATUS: Record<ErrorCode, HttpCode> = {
  [ErrorCode.VALIDATION_FAILED]: HttpCode.BAD_REQUEST,
  [ErrorCode.UNAUTHENTICATED]: HttpCode.UNAUTHORIZED,
  [ErrorCode.INVALID_CREDENTIALS]: HttpCode.UNAUTHORIZED,
  [ErrorCode.CSRF_INVALID]: HttpCode.FORBIDDEN,
  [ErrorCode.NOT_FOUND]: HttpCode.NOT_FOUND,
  [ErrorCode.CONFLICT]: HttpCode.CONFLICT,
  [ErrorCode.INSUFFICIENT_BUDGET]: HttpCode.CONFLICT,
  [ErrorCode.CAPABILITY_UNAVAILABLE]: HttpCode.CONFLICT,
  [ErrorCode.PAYLOAD_TOO_LARGE]: HttpCode.PAYLOAD_TOO_LARGE,
  [ErrorCode.RATE_LIMITED]: HttpCode.TOO_MANY_REQUESTS,
  [ErrorCode.PROVIDER_UNAVAILABLE]: HttpCode.BAD_GATEWAY,
  [ErrorCode.INTERNAL]: HttpCode.INTERNAL_SERVER_ERROR,
};

const RETRYABLE_CODES = new Set<ErrorCode>([
  ErrorCode.RATE_LIMITED,
  ErrorCode.PROVIDER_UNAVAILABLE,
  ErrorCode.INTERNAL,
]);

export interface AppErrorOptions {
  fields?: Record<string, string>;
  retryable?: boolean;
  cause?: unknown;
}

class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: HttpCode;
  public readonly retryable: boolean;
  public readonly fields?: Record<string, string>;
  public readonly cause?: unknown;

  static standard = {
    code: ErrorCode.INTERNAL,
    message: Message.SOMETHING_WENT_WRONG as string,
  };

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = CODE_HTTP_STATUS[code];
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code);
    this.fields = options.fields;
    this.cause = options.cause;
  }
}

export default AppError;
