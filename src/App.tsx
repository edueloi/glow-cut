import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientBooking from "./pages/ClientBooking";
import AdminDashboard from "./pages/AdminDashboard";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { Eye, EyeOff, Scissors, UserCog } from "lucide-react";
import { cn } from "./lib/utils";

/* ─────────────────────────────────────────────────────────
   LOGIN PAGE — unified (admin + super admin auto-detect)
───────────────────────────────────────────────────────── */
function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in?
  if (localStorage.getItem("superAdminLogged")) return <Navigate to="/super-admin" />;
  if (localStorage.getItem("isLogged") === "true") return <Navigate to="/admin" />;

  const handleLogin = async () => {
    if (!user || !pass) return;
    setLoading(true);
    setError("");

    try {
      // 1) Try super admin first
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

      // 2) Try admin login
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

      // 3) Legacy fallback
      if (user === "admin" && pass === "admin") {
        localStorage.setItem("isLogged", "true");
        window.location.href = "/admin";
        return;
      }

      setError("Usuário ou senha inválidos.");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/3 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
              <Scissors size={26} className="text-white" />
            </div>
            <div className="absolute -inset-1 bg-amber-500/20 rounded-3xl blur-lg -z-10" />
          </div>
          <h1 className="text-xl font-black text-white mt-4 tracking-tight">Glow & Cut</h1>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-[0.2em] mt-1">Studio Management</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-3xl border border-white/8 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Card header */}
          <div className="px-7 pt-7 pb-5 border-b border-white/5">
            <h2 className="text-sm font-black text-white">Bem-vindo de volta</h2>
            <p className="text-[11px] text-zinc-500 mt-1 font-medium">Acesse sua conta para continuar</p>
          </div>

          {/* Form */}
          <div className="px-7 py-6 space-y-4">
            {/* Usuário */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Usuário ou E-mail
              </label>
              <input
                type="text"
                value={user}
                autoComplete="username"
                autoFocus
                onChange={e => setUser(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="Digite seu usuário"
                className="w-full text-xs font-semibold px-4 py-3.5 rounded-xl bg-zinc-800/60 border border-white/8 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all"
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  autoComplete="current-password"
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full text-xs font-semibold px-4 py-3.5 pr-12 rounded-xl bg-zinc-800/60 border border-white/8 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleLogin}
              disabled={loading || !user || !pass}
              className={cn(
                "w-full py-3.5 rounded-xl text-sm font-black transition-all mt-1",
                "bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/25",
                "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-amber-500",
                "relative overflow-hidden group"
              )}
            >
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : "Entrar"}
              </span>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-[10px] text-zinc-600 font-medium">
            Desenvolvido por{" "}
            <span className="text-zinc-500 font-black">Develoi Soluções Digitais</span>
          </p>
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
              <UserCog size={26} className="text-white" />
            </div>
            <div className="absolute -inset-1 bg-amber-500/20 rounded-3xl blur-lg -z-10" />
          </div>
          <h1 className="text-xl font-black text-white mt-4 tracking-tight">Acesso Profissional</h1>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-[0.2em] mt-1">Glow & Cut Studio</p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-3xl border border-white/8 shadow-2xl shadow-black/60 overflow-hidden">
          <div className="px-7 pt-7 pb-5 border-b border-white/5">
            <h2 className="text-sm font-black text-white">Bem-vindo de volta</h2>
            <p className="text-[11px] text-zinc-500 mt-1 font-medium">Entre com suas credenciais</p>
          </div>

          <div className="px-7 py-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Seu Nome</label>
              <input
                type="text"
                className="w-full text-xs font-semibold px-4 py-3.5 rounded-xl bg-zinc-800/60 border border-white/8 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all"
                placeholder="Ex: João Silva"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="w-full text-xs font-semibold px-4 py-3.5 pr-12 rounded-xl bg-zinc-800/60 border border-white/8 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all"
                  placeholder="••••••••"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <button
              className={cn(
                "w-full py-3.5 rounded-xl text-sm font-black transition-all mt-1",
                "bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/25",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
              onClick={handleLogin}
              disabled={loading || !name || !pass}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <p className="text-[10px] text-center text-zinc-600 font-medium pt-1">
              Acesso cadastrado pelo administrador
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-zinc-600 font-medium">
            Desenvolvido por{" "}
            <span className="text-zinc-500 font-black">Develoi Soluções Digitais</span>
          </p>
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
  const raw = localStorage.getItem("superAdminLogged");
  if (!raw) return <Navigate to="/login" />;
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
        {/* Public */}
        <Route path="/" element={<ClientBooking />} />
        <Route path="/agendar/:slug" element={<ClientBooking />} />
        <Route path="/agendar" element={<Navigate to="/" />} />

        {/* Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin */}
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/*" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

        {/* Super Admin */}
        <Route path="/super-admin" element={<SuperAdminPage />} />
        <Route path="/super-admin/*" element={<SuperAdminPage />} />

        {/* Professional */}
        <Route path="/pro/login" element={<ProfessionalLogin />} />
        <Route path="/pro" element={<ProfessionalDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
