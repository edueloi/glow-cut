/**
 * Helper para chamadas de API com autenticação JWT.
 * O token é guardado em sessionStorage (limpo ao fechar o browser).
 * O tenantId vem do token decodificado — não é lido do localStorage.
 */

const TOKEN_KEY = "auth_token";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Decodifica o payload JWT sem verificar assinatura (só client-side) */
export function decodeToken(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  return decodeToken(token)?.sub ?? null;
}

export function getCurrentTenantId(): string | null {
  const token = getToken();
  if (!token) return null;
  return decodeToken(token)?.tenantId ?? null;
}

export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

// ── apiFetch ──────────────────────────────────────────────────────────────────

export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const tenantId = getCurrentTenantId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  return fetch(url, { ...options, headers });
}
