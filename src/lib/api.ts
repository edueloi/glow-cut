/**
 * Helper para chamadas de API com tenantId automático.
 * Lê o tenantId do adminUser no localStorage e injeta como header.
 */

export function getTenantId(): string | null {
  try {
    const stored = localStorage.getItem("adminUser");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.tenantId || null;
  } catch {
    return null;
  }
}

export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const tenantId = getTenantId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }
  return fetch(url, { ...options, headers });
}
