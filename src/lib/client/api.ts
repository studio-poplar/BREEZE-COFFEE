"use client";

export async function apiFetch<T>(
  input: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has("Content-Type") && rest.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...rest, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      (data?.error?.formErrors?.[0] as string | undefined) ||
      `request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}
