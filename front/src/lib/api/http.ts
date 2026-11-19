import { ApiError } from "./api-error";

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export type RequestFn = <T>(path: string, options?: RequestOptions) => Promise<T>;

export type StreamFn = (path: string, options?: RequestOptions) => Promise<Response>;

export const API_BASE_PATH = "/api";

function buildHeaders(options: RequestOptions, accept = "application/json"): HeadersInit {
  const headers: Record<string, string> = { Accept: accept };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  return headers;
}

async function send(path: string, options: RequestOptions, accept?: string): Promise<Response> {
  try {
    return await fetch(`${API_BASE_PATH}${path}`, {
      method: options.method ?? "GET",
      headers: buildHeaders(options, accept),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw ApiError.network();
  }
}

export const openStream: StreamFn = async (path, options = {}) => {
  const response = await send(path, options, "text/event-stream");

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, await response.json().catch(() => null));
  }

  return response;
};

export const request: RequestFn = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await send(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, payload);
  }

  return payload as T;
};
