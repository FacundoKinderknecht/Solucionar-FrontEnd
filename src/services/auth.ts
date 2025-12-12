import { BASE_URL, postForm, postJSON, setToken, getToken, clearToken } from "./api";

export type LoginResponse = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  access_token: string;
  token_type: "bearer";
};

export async function loginWithPassword(email: string, password: string): Promise<LoginResponse> {
  const data = await postForm<LoginResponse>("/auth/login", {
    username: email,
    password,
    grant_type: "password",
  });
  setToken(data.access_token);
  return data;
}

export type RegisterInput = {
  full_name: string;
  email: string;
  password: string;
  phone?: string | null;
  province?: string | null;
  city?: string | null;
};

export type UserPublic = { id: number; full_name: string; email: string; role: string };

export async function registerAndLogin(input: RegisterInput): Promise<UserPublic> {
  const created = await postJSON<UserPublic>("/auth/register", {
    full_name: input.full_name,
    email: input.email,
    password: input.password,
    phone: input.phone ?? null,
    province: input.province ?? null,
    city: input.city ?? null,
  });
  await loginWithPassword(input.email, input.password);
  return created;
}

export async function fetchMe() {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function logout() { clearToken(); }

export async function getMyProvider() {
  return fetch(`${BASE_URL}/providers/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(async (res) => {
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  });
}

export async function upsertMyProvider(payload: unknown) {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(`${BASE_URL}/providers/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}
