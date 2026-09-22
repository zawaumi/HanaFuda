import { apiConfig } from "./config";
import { ApiError, type ApiErrorKind } from "./errors";
import { getAuthorizationHeader } from "./auth-header";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
};

interface ApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

function errorKindForStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 422) return "validation";
  if (status >= 500) return "server";
  return "http";
}

function errorMessageForStatus(status: number): string {
  if (status === 401) return "認証が必要です。ログイン状態を確認してください。";
  if (status === 404) return "対象が見つかりません。一覧から選び直してください。";
  if (status === 422) return "入力内容を確認し、修正してから再度お試しください。";
  if (status >= 500) return "サーバーで問題が発生しました。時間をおいて再度お試しください。";
  return `通信に失敗しました（${status}）。時間をおいて再度お試しください。`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => undefined);
  }

  return response.text().catch(() => undefined);
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? apiConfig.baseUrl;
  const defaultTimeoutMs = options.timeoutMs ?? apiConfig.timeoutMs;
  const fetcher = options.fetcher ?? fetch;

  return async function apiFetch<T>(
    path: string,
    request: ApiRequestOptions = {},
  ): Promise<T> {
    if (!path.startsWith("/")) {
      throw new Error("API path must start with '/'.");
    }

    const controller = new AbortController();
    const timeoutMs = request.timeoutMs ?? defaultTimeoutMs;
    let timedOut = false;

    const cancelFromCaller = () => controller.abort(request.signal?.reason);
    if (request.signal?.aborted) cancelFromCaller();
    request.signal?.addEventListener("abort", cancelFromCaller, { once: true });

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const headers = new Headers(request.headers);
    headers.set("Accept", "application/json");
    if (request.body !== undefined) headers.set("Content-Type", "application/json");

    const authorization = await getAuthorizationHeader();
    if (authorization) headers.set("Authorization", authorization);

    try {
      const response = await fetcher(`${baseUrl}${path}`, {
        ...request,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        headers,
        signal: controller.signal,
      });
      const responseBody = await readResponseBody(response);

      if (!response.ok) {
        throw new ApiError(errorMessageForStatus(response.status), {
          kind: errorKindForStatus(response.status),
          status: response.status,
          details: responseBody,
        });
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) {
        throw new ApiError("通信がタイムアウトしました。", {
          kind: "timeout",
          cause: error,
        });
      }
      if (request.signal?.aborted) {
        throw new ApiError("通信がキャンセルされました。", {
          kind: "cancelled",
          cause: error,
        });
      }
      throw new ApiError("サーバーへ接続できませんでした。", {
        kind: "network",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener("abort", cancelFromCaller);
    }
  };
}

export const apiFetch = createApiClient();
