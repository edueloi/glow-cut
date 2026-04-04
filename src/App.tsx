import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientBooking from "./pages/ClientBooking";
import AdminDashboard from "./pages/AdminDashboard";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { Eye, EyeOff, Scissors, UserCog, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "./lib/utils";

/* ─────────────────────────────────────────────────────────
   LOGIN PAGE — unified (auto-detect admin vs super admin)
───────────────────────────────────────────────────────── */
function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (localStorage.getItem("superAdminLogged")) return <Navigate to="/super-admin" />;
  if (localStorage.getItem("isLogged") === "true") return <Navigate to="/admin" />;

  const handleLogin = async () => {
    if (!user || !pass) return;
    setLoading(true);
    setError("");

    try {
      // Endpoint unificado (disponível após reinício do servidor)
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: user, password: pass }),
      });

      if (res.status !== 404) {
        // Servidor novo com /api/login
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || "Usuário ou senha inválidos.");
          return;
        }
        const d = await res.json();
        if (d.type === "superadmin") {
          localStorage.setItem("superAdminLogged", JSON.stringify(d));
          window.location.href = "/super-admin";
        } else if (d.type === "professional") {
          localStorage.setItem("professionalLogged", JSON.stringify(d));
          window.location.href = "/pro";
        } else {
          localStorage.setItem("isLogged", "true");
          localStorage.setItem("adminUser", JSON.stringify(d));
          window.location.href = "/admin";
        }
        return;
      }

      // Fallback: servidor antigo — tenta as duas rotas separadas
      const saRes = await fetch("/api/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (saRes.ok) {
        const d = await saRes.json();
        localStorage.setItem("superAdminLogged", JSON.stringify(d));
        window.location.href = "/super-admin";
        return;
      }

      const adminRes = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user, password: pass }),
      });
      if (adminRes.ok) {
        const d = await adminRes.json();
        localStorage.setItem("isLogged", "true");
        localStorage.setItem("adminUser", JSON.stringify(d));
        window.location.href = "/admin";
        return;
      }

      setError("Usuário ou senha inválidos.");
    } catch {
      setError("Erro de conexão. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Painel esquerdo — branding ─────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-950 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-600/8 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-xs">
          <div className="relative inline-block mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/40">
              <Scissors size={32} className="text-white" />
            </div>
            <div className="absolute -inset-2 bg-amber-500/15 rounded-[28px] blur-xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-lg flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
            Glow & Cut
          </h1>
          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.25em] mt-2">
            Studio Management
          </p>

          <div className="mt-10 space-y-3">
            {[
              "Agendamentos em tempo real",
              "Gestão completa de clientes",
              "Controle financeiro e comandas",
              "Múltiplos profissionais",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-left">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <p className="text-[12px] text-zinc-400 font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 text-center z-10">
          <p className="text-[10px] text-zinc-700 font-medium">
            Desenvolvido por{" "}
            <span className="text-zinc-500 font-black">Develoi Soluções Digitais</span>
          </p>
        </div>
      </div>

      {/* ── Painel direito — form ──────────────────────── */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 sm:p-10 min-h-screen lg:min-h-0">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/25 mb-4">
            <Scissors size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-black text-zinc-900">Glow & Cut</h1>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Studio Management</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Bem-vindo!</h2>
            <p className="text-sm text-zinc-500 mt-1.5 font-medium">Acesse sua conta para continuar</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Usuário */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Usuário ou E-mail
              </label>
              <input
                type="text"
                value={user}
                autoComplete="username"
                autoFocus
                onChange={e => { setUser(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="Digite seu usuário ou e-mail"
                className="w-full text-sm font-semibold px-4 py-3.5 rounded-2xl bg-zinc-50 border-2 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10 outline-none transition-all"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  autoComplete="current-password"
                  onChange={e => { setPass(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full text-sm font-semibold px-4 py-3.5 pr-12 rounded-2xl bg-zinc-50 border-2 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleLogin}
              disabled={loading || !user || !pass}
              className={cn(
                "w-full py-4 rounded-2xl text-sm font-black transition-all",
                "bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-900/20",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2 group"
              )}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>

          {/* Mobile footer */}
          <div className="lg:hidden mt-8 text-center">
            <p className="text-[10px] text-zinc-400 font-medium">
              Desenvolvido por{" "}
              <span className="text-zinc-500 font-black">Develoi Soluções Digitais</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PROFESSIONAL LOGIN
───────────────────────────────────────────────────────── */
function ProfessionalLogin() {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (localStorage.getItem("professionalLogged")) return <Navigate to="/pro" />;

  const handleLogin = async () => {
    if (!name || !pass) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/professionals/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password: pass }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao entrar.");
      } else {
        const prof = await res.json();
        localStorage.setItem("professionalLogged", JSON.stringify(prof));
        window.location.href = "/pro";
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-950 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>
        <div className="relative z-10 text-center max-w-xs">
          <div className="relative inline-block mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/40">
              <UserCog size={32} className="text-white" />
            </div>
            <div className="absolute -inset-2 bg-amber-500/15 rounded-[28px] blur-xl" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Glow & Cut</h1>
          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.25em] mt-2">Acesso Profissional</p>
          <p className="text-xs text-zinc-500 mt-6 leading-relaxed font-medium">
            Área exclusiva para profissionais cadastrados pelo administrador do estúdio.
          </p>
        </div>
        <div className="absolute bottom-8 text-center z-10">
          <p className="text-[10px] text-zinc-700 font-medium">
            Desenvolvido por <span className="text-zinc-500 font-black">Develoi Soluções Digitais</span>
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 sm:p-10 min-h-screen lg:min-h-0">
        <div className="lg:hidden text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/25 mb-4">
            <UserCog size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-black text-zinc-900">Glow & Cut</h1>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Acesso Profissional</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Bem-vindo!</h2>
            <p className="text-sm text-zinc-500 mt-1.5 font-medium">Entre com suas credenciais</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Seu Nome</label>
              <input
                type="text"
                className="w-full text-sm font-semibold px-4 py-3.5 rounded-2xl bg-zinc-50 border-2 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10 outline-none transition-all"
                placeholder="Ex: João Silva"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="w-full text-sm font-semibold px-4 py-3.5 pr-12 rounded-2xl bg-zinc-50 border-2 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10 outline-none transition-all"
                  placeholder="••••••••"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <button
              className={cn(
                "w-full py-4 rounded-2xl text-sm font-black transition-all",
                "bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-900/20",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2 group"
              )}
              onClick={handleLogin}
              disabled={loading || !name || !pass}
            >
              {loading ? "Verificando..." : <><span>Entrar</span><ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>}
            </button>
            <p className="text-[10px] text-center text-zinc-400 font-medium">
              Acesso cadastrado pelo administrador
            </p>
          </div>

          <div className="lg:hidden mt-8 text-center">
            <p className="text-[10px] text-zinc-400 font-medium">
              Desenvolvido por <span className="text-zinc-500 font-black">Develoi Soluções Digitais</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   GUARDS
───────────────────────────────────────────────────────── */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (localStorage.getItem("isLogged") !== "true") return <Navigate to="/login" />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("superAdminLogged")) return <Navigate to="/login" />;
  return <>{children}</>;
}

function SuperAdminPage() {
  const raw = localStorage.getItem("superAdminLogged");
  if (!raw) return <Navigate to="/login" />;
  const sa = JSON.parse(raw);
  const handleLogout = () => {
    localStorage.removeItem("superAdminLogged");
    window.location.href = "/login";
  };
  return <SuperAdminDashboard username={sa.username} onLogout={handleLogout} />;
}

/* ─────────────────────────────────────────────────────────
   APP ROUTER
───────────────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientBooking />} />
        <Route path="/agendar/:slug" element={<ClientBooking />} />
        <Route path="/agendar" element={<Navigate to="/" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/*" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/super-admin" element={<SuperAdminPage />} />
        <Route path="/super-admin/*" element={<SuperAdminPage />} />
        <Route path="/pro/login" element={<ProfessionalLogin />} />
        <Route path="/pro" element={<ProfessionalDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
