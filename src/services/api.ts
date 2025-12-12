export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function postForm<T>(path: string, data: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

// Helper: authorized GET/POST/PUT wrappers are below

export function setToken(token: string) { localStorage.setItem("access_token", token); }
export function getToken(): string | null { return localStorage.getItem("access_token"); }
export function clearToken() { localStorage.removeItem("access_token"); }

export async function getJSON<T>(path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string,string> = { "Accept": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

export async function putJSON<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json() as Promise<T>;
}