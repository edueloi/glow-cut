import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientBooking from "./pages/ClientBooking";
import AdminDashboard from "./pages/AdminDashboard";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { Eye, EyeOff, Crown, Scissors, UserCog } from "lucide-react";
import { cn } from "./lib/utils";

/* ─────────────────────────────────────────────────────────
   LOGIN PAGE (Admin + Super Admin)
───────────────────────────────────────────────────────── */
type LoginMode = "admin" | "superadmin";

function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("admin");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in?
  const saSession = localStorage.getItem("superAdminLogged");
  const adminSession = localStorage.getItem("isLogged");
  if (saSession) return <Navigate to="/super-admin" />;
  if (adminSession === "true") return <Navigate to="/admin" />;

  const handleLogin = async () => {
    if (!user || !pass) return;
    setLoading(true);
    setError("");

    try {
      if (mode === "superadmin") {
        const r = await fetch("/api/super-admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user, password: pass }),
        });
        if (!r.ok) {
          const d = await r.json();
          setError(d.error || "Credenciais inválidas.");
        } else {
          const d = await r.json();
          localStorage.setItem("superAdminLogged", JSON.stringify(d));
          window.location.href = "/super-admin";
        }
      } else {
        // Admin login via DB
        const r = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user, password: pass }),
        });
        if (!r.ok) {
          // Fallback: legacy hardcoded check for existing dev setup
          if (user === "admin" && pass === "admin") {
            localStorage.setItem("isLogged", "true");
            window.location.href = "/admin";
            return;
          }
          const d = await r.json();
          setError(d.error || "E-mail ou senha inválidos.");
        } else {
          const d = await r.json();
          localStorage.setItem("isLogged", "true");
          localStorage.setItem("adminUser", JSON.stringify(d));
          window.location.href = "/admin";
        }
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = mode === "superadmin";

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-4 transition-colors duration-500",
      isSuperAdmin ? "bg-zinc-950" : "bg-gradient-to-br from-zinc-50 to-zinc-100"
    )}>
      <div className="w-full max-w-sm">
        {/* Mode toggle pills */}
        <div className={cn("flex gap-1 p-1 rounded-2xl mb-6 mx-auto w-fit", isSuperAdmin ? "bg-zinc-900" : "bg-zinc-200")}>
          {([
            { key: "admin" as const, label: "Admin", icon: <Scissors size={12} /> },
            { key: "superadmin" as const, label: "Super Admin", icon: <Crown size={12} /> },
          ]).map(m => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setError(""); setUser(""); setPass(""); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all uppercase tracking-wider",
                mode === m.key
                  ? isSuperAdmin
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                    : "bg-white text-zinc-900 shadow-sm"
                  : isSuperAdmin
                    ? "text-zinc-500 hover:text-zinc-300"
                    : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className={cn(
          "rounded-3xl border shadow-2xl overflow-hidden",
          isSuperAdmin
            ? "bg-zinc-900 border-white/5 shadow-black/50"
            : "bg-white border-zinc-200 shadow-zinc-200/80"
        )}>
          {/* Header */}
          <div className={cn("px-8 py-7 border-b", isSuperAdmin ? "border-white/5" : "border-zinc-100")}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0",
                isSuperAdmin
                  ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30"
                  : "bg-zinc-950 shadow-zinc-900/20"
              )}>
                {isSuperAdmin
                  ? <Crown size={20} className="text-white" />
                  : <Scissors size={18} className="text-amber-400" />}
              </div>
              <div>
                <h1 className={cn("text-sm font-black leading-tight", isSuperAdmin ? "text-white" : "text-zinc-900")}>
                  {isSuperAdmin ? "Acesso Super Admin" : "Painel Administrativo"}
                </h1>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-0.5", isSuperAdmin ? "text-amber-500" : "text-zinc-400")}>
                  {isSuperAdmin ? "Plataforma Glow & Cut" : "Glow & Cut Studio"}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-6 space-y-4">
            <div className="space-y-1.5">
              <label className={cn("text-[10px] font-black uppercase tracking-widest", isSuperAdmin ? "text-zinc-500" : "text-zinc-400")}>
                {isSuperAdmin ? "Usuário" : "E-mail ou Usuário"}
              </label>
              <input
                type="text"
                value={user}
                autoComplete="username"
                onChange={e => setUser(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder={isSuperAdmin ? "Admin" : "seu@email.com"}
                className={cn(
                  "w-full text-xs font-semibold px-4 py-3 rounded-xl border outline-none transition-all",
                  isSuperAdmin
                    ? "bg-zinc-800 border-white/5 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10"
                    : "bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className={cn("text-[10px] font-black uppercase tracking-widest", isSuperAdmin ? "text-zinc-500" : "text-zinc-400")}>
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
                  className={cn(
                    "w-full text-xs font-semibold px-4 py-3 pr-11 rounded-xl border outline-none transition-all",
                    isSuperAdmin
                      ? "bg-zinc-800 border-white/5 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10"
                      : "bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors", isSuperAdmin ? "text-zinc-600 hover:text-zinc-400" : "text-zinc-400 hover:text-zinc-600")}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className={cn("text-[10px] font-bold text-center px-3 py-2 rounded-xl", isSuperAdmin ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500 border border-red-100")}>
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !user || !pass}
              className={cn(
                "w-full py-3.5 rounded-xl text-sm font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2",
                isSuperAdmin
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                  : "bg-zinc-950 hover:bg-zinc-800 text-white shadow-md"
              )}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>

        <p className={cn("text-center text-[10px] mt-4 font-medium", isSuperAdmin ? "text-zinc-700" : "text-zinc-400")}>
          {isSuperAdmin
            ? "Acesso restrito ao proprietário da plataforma"
            : "Acesso para gerenciar o estúdio"}
        </p>
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
            <UserCog size={22} className="text-white" />
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-tighter">Acesso Profissional</h2>
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">Glow & Cut Studio</p>
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 space-y-4 shadow-2xl shadow-black/50">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Seu Nome</label>
            <input
              type="text"
              className="w-full text-xs p-3.5 bg-zinc-800 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 outline-none font-semibold placeholder:text-zinc-600"
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
                className="w-full text-xs p-3.5 pr-11 bg-zinc-800 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 outline-none font-semibold placeholder:text-zinc-600"
                placeholder="Sua senha"
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/10 py-2 rounded-xl">{error}</p>}

          <button
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40"
            onClick={handleLogin}
            disabled={loading || !name || !pass}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p className="text-[9px] text-center text-zinc-600 font-medium">Acesso cadastrado pelo administrador.</p>
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
