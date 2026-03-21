const portalBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('portal_token');
}

export async function portalFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getPortalToken();
  const res = await fetch(`${portalBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-portal-token': token } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `API error ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export function getPortalApiBase(): string { return portalBase; }
