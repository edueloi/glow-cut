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
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import RegistrationPage from "./pages/RegistrationPage";
import SetupAccountPage from "./pages/SetupAccountPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import PlatformLegalPage from "./pages/PlatformLegalPage";
import ClientPortalPage from "./pages/ClientPortalPage";
import { Eye, EyeOff, ArrowRight, AlertCircle, Shield, Zap, BarChart3, Calendar } from "lucide-react";

import logoFavicon from "./images/system/logo-favicon.png";
import logoWhite from "./images/system/imagem-agendele-branco.png";

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
  cpf?: string;
  birthDate?: string;
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
  planName?: string;
  maxProfessionals?: number;
  canCreateUsers?: boolean;
  canDeleteAccount?: boolean;
  tenantCreatedAt?: string;
  tenantExpiresAt?: string;
  onboardingStep: number;
  segment?: string;
  themeColor?: string;
  permissions: PermissionSet | null; // null = acesso total (owner)
  wppEnabled?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ error?: string; user?: AuthUser; paymentPending?: boolean; checkoutUrl?: string }>;
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

  const login = async (identifier: string, password: string): Promise<{ error?: string; user?: AuthUser; paymentPending?: boolean; checkoutUrl?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { error: d.error || "Usuário ou senha inválidos.", paymentPending: d.paymentPending, checkoutUrl: d.checkoutUrl };
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
  const [paymentPendingUrl, setPaymentPendingUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Esqueci a senha
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) setForgotError(data.error || "Erro ao enviar.");
      else setForgotDone(true);
    } catch {
      setForgotError("Erro de conexão. Tente novamente.");
    } finally {
      setForgotLoading(false);
    }
  };

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
    setPaymentPendingUrl(null);

    if (remember) localStorage.setItem("savedLoginUser", identifier);
    else localStorage.removeItem("savedLoginUser");

    const { error: err, user: loggedUser, paymentPending, checkoutUrl } = await login(identifier, pass);
    if (err) {
      if (paymentPending) {
        setPaymentPendingUrl(checkoutUrl || null);
      }
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
      {/* ── Painel esquerdo — branding premium ─────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-[#050505]">
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
        </div>

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",backgroundSize:"48px 48px"}} />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-14 py-12 h-full">
          
          {/* App Icon Container */}
          <div className="relative mb-8 group">
            {/* Pulsing Outer Glow */}
            <div className="absolute -inset-1 bg-indigo-500/20 rounded-[2.2rem] blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
            
            {/* Box */}
            <div className="relative w-24 h-24 bg-[#0a0a0f] border border-white/5 rounded-[2.2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
              {/* Spinning gradient background effect */}
              <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(99,102,241,0.3)_360deg)] animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-[1px] bg-[#0a0a0f] rounded-[2.1rem]" />
              
              {/* Logo Image */}
              <img src={logoFavicon} alt="Agendelle" className="h-11 w-auto relative z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-md" />
            </div>
          </div>

          {/* Titles */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-black text-white tracking-tight mb-4 drop-shadow-sm">
              Agendelle
            </h1>
            <p className="text-[10px] font-black text-zinc-500 tracking-[0.3em] uppercase">
              Agendamentos Inteligentes
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4 max-w-[280px] w-full">
            {[
              "Agendamentos automatizados",
              "Gestão 360 do seu negócio",
              "Link de auto-agendamento",
              "Relatórios inteligentes",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] group-hover:bg-indigo-400 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.9)] transition-all" />
                <span className="text-[13px] font-semibold text-zinc-400 group-hover:text-zinc-300 transition-colors">{item}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="absolute bottom-8 text-center w-full">
            <p className="text-[11px] font-semibold text-zinc-600">
              © 2026 <span className="text-zinc-400">Agendelle</span> • Sua agenda de forma inteligente
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel direito — formulário ─────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-white via-zinc-50/50 to-amber-50/30 relative">
        {/* Mobile subtle background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-[100px] lg:hidden" />
        
        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-50 to-white border border-amber-200/50 rounded-2xl flex items-center justify-center p-2 shadow-sm">
              <img src={logoFavicon} alt="Agendelle" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-lg font-black text-zinc-900 tracking-tight leading-none">Agendelle</p>
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.15em] mt-1">Painel Administrativo</p>
            </div>
          </div>

          <h2 className="text-2xl font-black text-zinc-900 mb-1 lg:text-3xl">Bem-vindo de volta</h2>
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
                className="w-full text-sm p-3.5 bg-white border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all placeholder:text-zinc-300 shadow-sm"
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
                  className="w-full text-sm p-3.5 pr-12 bg-white border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all placeholder:text-zinc-300 shadow-sm"
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

            {error && !paymentPendingUrl && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                {error}
              </div>
            )}

            {error && paymentPendingUrl && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-800">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(paymentPendingUrl!, "_blank", "noopener,noreferrer")}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl py-2.5 text-xs transition-all shadow-md shadow-amber-200 uppercase tracking-widest"
                >
                  Ativar assinatura agora <ArrowRight size={13} />
                </button>
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
              <button
                type="button"
                onClick={() => { setForgotOpen(true); setForgotDone(false); setForgotError(""); setForgotEmail(identifier || ""); }}
                className="text-[11px] font-bold text-amber-500 hover:text-amber-600 transition-colors uppercase tracking-wider"
              >
                Esqueci a senha
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={submitting || !identifier || !pass}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 text-sm transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98]"
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

      {/* ── Modal Esqueci a Senha ─────────────────────── */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setForgotOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 z-10">
            {forgotDone ? (
              <div className="text-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-zinc-900 mb-2">E-mail enviado!</h3>
                <p className="text-sm text-zinc-500 mb-6">
                  Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
                </p>
                <button
                  onClick={() => setForgotOpen(false)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl py-3 text-sm transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-zinc-900 mb-1">Recuperar senha</h3>
                <p className="text-xs text-zinc-400 mb-6">Digite seu e-mail e enviaremos um link para redefinir sua senha.</p>
                <div className="space-y-4">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                    placeholder="seu@email.com"
                    className="w-full text-sm p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all placeholder:text-zinc-400"
                    autoFocus
                  />
                  {forgotError && (
                    <p className="text-xs font-bold text-red-500 bg-red-50 rounded-xl px-3 py-2">{forgotError}</p>
                  )}
                  <button
                    onClick={handleForgotPassword}
                    disabled={forgotLoading || !forgotEmail}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : "Enviar link de recuperação"}
                  </button>
                  <button
                    onClick={() => setForgotOpen(false)}
                    className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors py-1"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
  
  // Redireciona para onboarding se não completou (e não estiver já na página de onboarding)
  if ((user.onboardingStep || 0) < 3 && window.location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  
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
  
  // Para admins, verifica onboarding
  if ((user.onboardingStep || 0) < 3) return <Navigate to="/onboarding" replace />;

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
      permissions={user?.permissions}
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

          <Route path="/onboarding" element={<RequireAdmin><OnboardingPage /></RequireAdmin>} />

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
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/pat/:professionalId" element={<PATQueue />} />
          <Route path="/pat/general/:slug" element={<PATQueue />} />
          <Route path="/:slug" element={<ProfessionalSite />} />
          <Route path="/:slug/privacidade" element={<SiteLegalPage type="privacy" />} />
          <Route path="/:slug/termos" element={<SiteLegalPage type="terms" />} />
          <Route path="/:slug/agendar" element={<ClientBooking />} />
          <Route path="/agendar/:slug" element={<ClientBooking />} />
          <Route path="/portal/:slug" element={<ClientPortalPage />} />
          <Route path="/assinar" element={<RegistrationPage />} />
          <Route path="/setup-account" element={<SetupAccountPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/termos" element={<PlatformLegalPage type="terms" />} />
          <Route path="/privacidade" element={<PlatformLegalPage type="privacy" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
