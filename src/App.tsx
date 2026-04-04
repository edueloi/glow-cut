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

      
      {/* Right panel: login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center">
              <Scissors size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-900">Glow &amp; Cut</p>
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Studio</p>
            </div>
          </div>

          <h2 className="text-2xl font-black text-zinc-900 mb-1">Bem-vindo de volta</h2>
          <p className="text-xs text-zinc-400 font-medium mb-8">Entre com suas credenciais para continuar</p>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                E-mail ou usuário
              </label>
              <input
                type="text"
                autoComplete="username"
                value={user}
                onChange={e => setUser(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
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
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full text-sm p-3.5 pr-12 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
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

            <button
              onClick={handleLogin}
              disabled={loading || !user || !pass}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              {loading ? (
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/pro/login"   element={<Navigate to="/login" replace />} />
        <Route path="/pro"         element={<ProfessionalDashboard />} />
        <Route path="/admin"       element={<AdminDashboard />} />
        <Route path="/super-admin" element={<SuperAdminDashboard username={(() => { try { return JSON.parse(localStorage.getItem("superAdminLogged") || "{}").username || "Admin"; } catch { return "Admin"; } })()} onLogout={() => { localStorage.removeItem("superAdminLogged"); window.location.href = "/login"; }} />} />
        <Route path="/:slug"       element={<ClientBooking />} />
        <Route path="/"            element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
