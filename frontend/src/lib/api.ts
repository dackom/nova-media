function getBaseUrl(): string {
  const url = import.meta.env.VITE_BACKEND_URL;
  if (typeof url !== "string" || !url) {
    throw new Error("VITE_BACKEND_URL is not set. Add it to your .env file.");
  }
  return url.replace(/\/$/, "");
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: Record<string, unknown> | unknown;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const body =
    options.body !== undefined
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : undefined;

  const res = await fetch(url, {
    ...options,
    headers,
    body,
    credentials: "include",
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message =
      typeof errBody?.message === "string"
        ? errBody.message
        : `Request failed: ${res.status} ${res.statusText}`;
    throw new ApiError(res.status, message, errBody);
  }

  const contentType = res.headers.get("Content-Type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function apiGet<T>(path: string, options?: ApiRequestOptions) {
  return apiFetch<T>(path, { ...options, method: "GET" });
}
function apiPost<T>(
  path: string,
  body?: Record<string, unknown>,
  options?: ApiRequestOptions
) {
  return apiFetch<T>(path, { ...options, method: "POST", body });
}
function apiPut<T>(
  path: string,
  body?: Record<string, unknown>,
  options?: ApiRequestOptions
) {
  return apiFetch<T>(path, { ...options, method: "PUT", body });
}
function apiPatch<T>(
  path: string,
  body?: Record<string, unknown>,
  options?: ApiRequestOptions
) {
  return apiFetch<T>(path, { ...options, method: "PATCH", body });
}
function apiDelete<T>(path: string, options?: ApiRequestOptions) {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}

export const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
};
