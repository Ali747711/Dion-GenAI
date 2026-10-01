import type { ApiErrorBody, SessionInfo } from "@/lib/api/types"

const BASE = "/api/v1"

/** Typed error carrying the contract error envelope. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string
  readonly retryable: boolean
  readonly fields: Record<string, string>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = "ApiError"
    this.status = status
    this.code = body.code
    this.requestId = body.requestId
    this.retryable = body.retryable
    this.fields = body.fields ?? {}
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Fired when any request returns 401 so the auth provider can gate the app. */
export const UNAUTHENTICATED_EVENT = "ms:unauthenticated"

let csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

function notifyUnauthenticated(): void {
  window.dispatchEvent(new CustomEvent(UNAUTHENTICATED_EVENT))
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {
    code: "INTERNAL",
    message: `Request failed with status ${response.status}`,
    requestId: response.headers.get("X-Request-Id") ?? "unknown",
    retryable: response.status >= 500,
  }
  try {
    const json: unknown = await response.json()
    if (
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error: unknown }).error === "object"
    ) {
      body = { ...body, ...(json as { error: ApiErrorBody }).error }
    }
  } catch {
    // Non-JSON error body; keep the fallback envelope.
  }
  return new ApiError(response.status, body)
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  signal?: AbortSignal
  /** Suppress the global 401 event (used by the session probe itself). */
  silentUnauthorized?: boolean
}

async function performRequest(
  path: string,
  options: RequestOptions
): Promise<Response> {
  const { method = "GET", body, signal } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  if (method !== "GET") {
    if (!csrfToken) {
      await refreshSession()
    }
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken
    }
  }
  return fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", silentUnauthorized = false } = options
  let response = await performRequest(path, options)

  // A stale CSRF token (e.g. racing session probes) gets one refresh + retry.
  if (response.status === 403 && method !== "GET") {
    const staleError = await parseError(response)
    if (staleError.code !== "CSRF_INVALID") {
      throw staleError
    }
    setCsrfToken(null)
    await refreshSession()
    response = await performRequest(path, options)
  }

  if (!response.ok) {
    const error = await parseError(response)
    if (error.status === 401 && !silentUnauthorized) {
      notifyUnauthenticated()
    }
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }
  const json = (await response.json()) as { data: T }
  return json.data
}

/** Same as {@link request} but returns the full list envelope. */
async function requestList<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T[]; nextCursor: string | null }> {
  const { method = "GET", signal, silentUnauthorized = false } = options
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: "same-origin",
    signal,
  })
  if (!response.ok) {
    const error = await parseError(response)
    if (error.status === 401 && !silentUnauthorized) {
      notifyUnauthenticated()
    }
    throw error
  }
  return (await response.json()) as { data: T[]; nextCursor: string | null }
}

/**
 * Resolve the cached CSRF token, refreshing the session once if needed.
 * Used by non-fetch transports (e.g. XHR uploads with progress events).
 */
export async function ensureCsrfToken(): Promise<string | null> {
  if (!csrfToken) {
    try {
      await refreshSession()
    } catch {
      // The caller's request will surface the auth failure itself.
    }
  }
  return csrfToken
}

/** Fetch the session and cache the CSRF token for mutations. */
async function refreshSession(): Promise<SessionInfo> {
  const session = await request<SessionInfo>("/session", {
    silentUnauthorized: true,
  })
  setCsrfToken(session.csrfToken)
  return session
}

export const api = { request, requestList, refreshSession }
