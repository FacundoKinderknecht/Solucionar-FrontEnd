import { BASE_URL } from "./api";
import { getToken } from "./api";

export type UserProfile = {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  province?: string | null;
  city?: string | null;
  role: string;
};

export async function getMyProfile(): Promise<UserProfile> {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(`${BASE_URL}/users/me/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type UserProfileUpdate = {
  full_name?: string | null;
  phone?: string | null;
  province?: string | null;
  city?: string | null;
};

export async function updateMyProfile(payload: UserProfileUpdate): Promise<UserProfile> {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(`${BASE_URL}/users/me/profile`, {
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

export async function getMyHistory() {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(`${BASE_URL}/users/me/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
