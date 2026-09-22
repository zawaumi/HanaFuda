export type ApiMode = "mock" | "remote";

export interface ApiConfig {
  mode: ApiMode;
  baseUrl: string;
  timeoutMs: number;
}

const DEFAULT_BASE_URL = "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 10_000;

interface ApiEnvironment {
  mode?: string;
  baseUrl?: string;
}

export function parseApiConfig(environment: ApiEnvironment): ApiConfig {
  const mode = environment.mode?.trim() || "mock";
  if (mode !== "mock" && mode !== "remote") {
    throw new Error("NEXT_PUBLIC_API_MODE must be 'mock' or 'remote'.");
  }

  const rawBaseUrl = environment.baseUrl?.trim() || DEFAULT_BASE_URL;
  let url: URL;

  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid URL.");
  }

  if (!(["http:", "https:"] as string[]).includes(url.protocol)) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use HTTP or HTTPS.");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must not include credentials, query, or hash.",
    );
  }

  return {
    mode,
    baseUrl: rawBaseUrl.replace(/\/+$/, ""),
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export const apiConfig = parseApiConfig({
  mode: process.env.NEXT_PUBLIC_API_MODE,
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});
