export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

type TokenProvider = () => string | null;

export type ApiClient = {
  getJSON<T>(path: string): Promise<T>;
  postJSON<T>(path: string, body: unknown): Promise<T>;
  putJSON<T>(path: string, body: unknown): Promise<T>;
  patchJSON<T>(path: string, body: unknown): Promise<T>;
  postForm<T>(path: string, data: Record<string, string>): Promise<T>;
};

type ApiClientConfig = {
  baseURL?: string;
  tokenProvider?: TokenProvider;
};

const jsonHeaders = { "Accept": "application/json" };

export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const baseURL = config.baseURL ?? BASE_URL;
  const tokenProvider = config.tokenProvider ?? getToken;

  async function request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH",
    path: string,
    body?: BodyInit,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const token = tokenProvider();
    const headers: Record<string, string> = { ...jsonHeaders, ...extraHeaders };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${baseURL}${path}`, {
      method,
      headers,
      body,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    getJSON: <T>(path: string) => request<T>("GET", path),
    postJSON: <T>(path: string, body: unknown) =>
      request<T>("POST", path, JSON.stringify(body), { "Content-Type": "application/json" }),
    putJSON: <T>(path: string, body: unknown) =>
      request<T>("PUT", path, JSON.stringify(body), { "Content-Type": "application/json" }),
    patchJSON: <T>(path: string, body: unknown) =>
      request<T>("PATCH", path, JSON.stringify(body), { "Content-Type": "application/json" }),
    postForm: <T>(path: string, data: Record<string, string>) =>
      request<T>("POST", path, new URLSearchParams(data), { "Content-Type": "application/x-www-form-urlencoded" }),
  };
}

const defaultApiClient = createApiClient();

export const getJSON = defaultApiClient.getJSON;
export const postJSON = defaultApiClient.postJSON;
export const putJSON = defaultApiClient.putJSON;
export const patchJSON = defaultApiClient.patchJSON;
export const postForm = defaultApiClient.postForm;

// Session helpers keep existing behavior
export function setToken(token: string) { localStorage.setItem("access_token", token); }
export function getToken(): string | null { return localStorage.getItem("access_token"); }
export function clearToken() { localStorage.removeItem("access_token"); }