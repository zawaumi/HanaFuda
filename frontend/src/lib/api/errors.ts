export type ApiErrorKind =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "server"
  | "http"
  | "network"
  | "timeout"
  | "cancelled";

export interface ApiValidationIssue {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

interface ApiErrorOptions {
  kind: ApiErrorKind;
  status?: number;
  details?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly details?: unknown;
  readonly originalCause?: unknown;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status;
    this.details = options.details;
    this.originalCause = options.cause;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
