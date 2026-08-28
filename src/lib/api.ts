/**
 * Helper para chamadas de API com autenticação JWT.
 * O token fica em sessionStorage por padrão (limpo ao fechar o browser); com "Lembrar de mim"
 * (remember=true) vai pra localStorage, sobrevivendo ao fechar/reabrir o navegador até o JWT
 * expirar de verdade (7 dias, ver JWT_EXPIRES no backend). Antes o checkbox só salvava o
 * identificador digitado — não tinha efeito nenhum na sessão em si.
 * O tenantId vem do token decodificado — não é lido separado do localStorage.
 */

const TOKEN_KEY = "auth_token";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveToken(token: string, remember: boolean = false) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
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
