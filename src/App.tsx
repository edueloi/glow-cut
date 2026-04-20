import {
  useState, useEffect, useContext, createContext, useCallback,
  type ReactNode,
} from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { PermissionsProvider } from "@/src/contexts/PermissionsContext";
import { type PermissionSet } from "@/src/lib/permissions";
import { saveToken, getToken, removeToken, isTokenExpired } from "@/src/lib/api";
import ClientBooking from "./pages/ClientBooking";
import PATQueue from "./pages/PATQueue";
import AdminDashboard from "./pages/AdminDashboard";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import LandingPage from "./pages/LandingPage";
import ProfessionalSite from "./pages/ProfessionalSite";
import SiteLegalPage from "./pages/SiteLegalPage";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

import logoFavicon from "./images/system/logo-favicon.png";

// ─────────────────────────────────────────────────────────────────────────────
// AuthContext — estado global de autenticação via JWT + /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  type: "admin" | "superadmin" | "professional";
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  jobTitle?: string;
  phone?: string;
  photo?: string;
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
  planName?: string;
  canCreateUsers?: boolean;
  canDeleteAccount?: boolean;
  permissions: PermissionSet | null; // null = acesso total (owner)
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ error?: string; user?: AuthUser }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider
// ─────────────────────────────────────────────────────────────────────────────

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega usuário do token ao iniciar
  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token || isTokenExpired()) {
      removeToken();
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        removeToken();
        setUser(null);
      } else {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (identifier: string, password: string): Promise<{ error?: string; user?: AuthUser }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { error: d.error || "Usuário ou senha inválidos." };
      }
      const { token, user: userData } = await res.json();
      saveToken(token);
      setUser(userData);
      return { user: userData };
    } catch {
      return { error: "Erro de conexão. Verifique sua internet." };
    }
  };

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    // Limpar apenas a chave de "lembrar usuário" do localStorage (não sensível)
    // Não armazenamos mais dados de sessão no localStorage
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tela de loading enquanto verifica token
// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400 font-medium">Verificando sessão…</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(
    () => localStorage.getItem("savedLoginUser") || ""
  );
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(
    () => !!localStorage.getItem("savedLoginUser")
  );
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redireciona se já logado
  if (!loading && user) {
    if (user.type === "superadmin") return <Navigate to="/super-admin" replace />;
    if (user.type === "professional") return <Navigate to="/pro" replace />;
    return <Navigate to="/admin" replace />;
  }

  const handleLogin = async () => {
    if (!identifier || !pass) return;
    setSubmitting(true);
    setError("");

    if (remember) localStorage.setItem("savedLoginUser", identifier);
    else localStorage.removeItem("savedLoginUser");

    const { error: err, user: loggedUser } = await login(identifier, pass);
    if (err) {
      setError(err);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    if (loggedUser?.type === "superadmin") navigate("/super-admin", { replace: true });
    else if (loggedUser?.type === "professional") navigate("/pro", { replace: true });
    else navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Painel esquerdo — branding ─────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-950 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-600/8 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="relative inline-block mb-8">
            <div className="w-24 h-24 bg-white/5 backdrop-blur-sm rounded-3xl flex items-center justify-center p-4 border border-white/10 shadow-2xl">
              <img src={logoFavicon} alt="Agendelle Logo" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -inset-4 bg-indigo-500/10 rounded-[40px] blur-2xl -z-10" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight">Agendelle</h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em] mt-3 opacity-80">
            AGENDAMENTOS INTELIGENTES
          </p>
          <div className="mt-12 space-y-3 max-w-[240px] mx-auto">
            {["Agendamentos automatizados", "Gestão 360 do seu negócio", "Link de auto-agendamento", "Relatórios inteligentes"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-left">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                <p className="text-[12px] text-zinc-400 font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 text-center z-10">
          <p className="text-[10px] text-zinc-600 font-medium tracking-wide">
            © 2026 <span className="text-zinc-400 font-black">Agendelle</span> •{" "}
            <span className="opacity-60">Sua agenda de forma inteligente</span>
          </p>
        </div>
      </div>

      {/* ── Painel direito — formulário ─────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center p-2 shadow-sm relative overflow-hidden">
              <img src={logoFavicon} alt="Agendelle" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-indigo-500/5" />
            </div>
            <div>
              <p className="text-lg font-black text-zinc-900 tracking-tight leading-none">Agendelle</p>
              <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.2em] mt-1.5 opacity-80">
                Dashboard Administrativo
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-black text-zinc-900 mb-1 lg:text-3xl">Bem-vindo</h2>
          <p className="text-xs text-zinc-400 font-medium mb-8">Acesse seu painel exclusivo Agendelle</p>

          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                E-mail ou usuário
              </label>
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="admin@exemplo.com"
                className="w-full text-sm p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all placeholder:text-zinc-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full text-sm p-3.5 pr-12 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 transition-colors"
                />
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Lembrar de mim
                </span>
              </label>
            </div>

            <button
              onClick={handleLogin}
              disabled={submitting || !identifier || !pass}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Entrar <ArrowRight size={16} /></>
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-zinc-400 mt-8 font-medium">
            Acesso exclusivo para equipe autorizada
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Guards de rota
// ─────────────────────────────────────────────────────────────────────────────

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user.type !== "admin") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user.type !== "superadmin") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireProfessional({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user.type !== "professional") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminWithPermissions — injeta permissões do usuário logado no contexto
// ─────────────────────────────────────────────────────────────────────────────
function AdminWithPermissions() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const roleLabel =
    user.role === "owner" || user.role === "admin"
      ? "Administrador"
      : user.role === "manager"
      ? "Gerente"
      : "Usuário";

  return (
    <PermissionsProvider permissions={user.permissions} roleLabel={roleLabel}>
      <AdminDashboard />
    </PermissionsProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Redireciona "/" para o painel correto conforme tipo de usuário
// ─────────────────────────────────────────────────────────────────────────────
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <LandingPage />;
  if (user.type === "superadmin") return <Navigate to="/super-admin" replace />;
  if (user.type === "professional") return <Navigate to="/pro" replace />;
  return <Navigate to="/admin" replace />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminWrapper — passa username e onLogout via contexto
// ─────────────────────────────────────────────────────────────────────────────
function SuperAdminWrapper() {
  const { user, logout } = useAuth();
  return (
    <SuperAdminDashboard
      username={user?.username || "Admin"}
      onLogout={logout}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pro/login" element={<Navigate to="/login" replace />} />

          <Route
            path="/pro"
            element={
              <RequireProfessional>
                <ProfessionalDashboard />
              </RequireProfessional>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminWithPermissions />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RequireAdmin>
                <AdminWithPermissions />
              </RequireAdmin>
            }
          />

          <Route
            path="/super-admin/*"
            element={
              <RequireSuperAdmin>
                <SuperAdminWrapper />
              </RequireSuperAdmin>
            }
          />

          <Route path="/" element={<HomeRedirect />} />
          <Route path="/pat/:professionalId" element={<PATQueue />} />
          <Route path="/pat/general/:slug" element={<PATQueue />} />
          <Route path="/:slug" element={<ProfessionalSite />} />
          <Route path="/:slug/privacidade" element={<SiteLegalPage type="privacy" />} />
          <Route path="/:slug/termos" element={<SiteLegalPage type="terms" />} />
          <Route path="/:slug/agendar" element={<ClientBooking />} />
          <Route path="/agendar/:slug" element={<ClientBooking />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
