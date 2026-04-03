import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientBooking from "./pages/ClientBooking";
import AdminDashboard from "./pages/AdminDashboard";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import { Button } from "./components/ui/Button";

function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [isLogged, setIsLogged] = useState(false);

  const handleLogin = () => {
    // Mocked login
    if (user === "admin" && pass === "admin") {
      setIsLogged(true);
      localStorage.setItem("isLogged", "true");
    }
  };

  if (isLogged || localStorage.getItem("isLogged") === "true") {
    return <Navigate to="/admin" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-white rounded-xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">G&C</span>
          </div>
          <h2 className="text-sm font-bold uppercase tracking-tight">Acesso Administrativo</h2>
          <p className="text-[10px] text-zinc-400">Glow & Cut Studio</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase">Usuário</label>
            <input
              type="text"
              className="w-full text-xs p-2 border border-zinc-200 rounded-md"
              value={user}
              onChange={e => setUser(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase">Senha</label>
            <input
              type="password"
              className="w-full text-xs p-2 border border-zinc-200 rounded-md"
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>
          <Button className="w-full" onClick={handleLogin}>Entrar no Painel</Button>
          <p className="text-[8px] text-center text-zinc-400 uppercase">Dica: admin / admin</p>
        </div>
      </div>
    </div>
  );
}

function ProfessionalLogin() {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (localStorage.getItem("professionalLogged")) {
    return <Navigate to="/pro" />;
  }

  const handleLogin = async () => {
    if (!name || !pass) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/professionals/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password: pass })
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
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
            <span className="text-zinc-950 font-black text-lg">G&C</span>
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-tighter">Acesso Profissional</h2>
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">Glow & Cut Studio</p>
        </div>

        <div className="bg-[#0f0f12] rounded-3xl border border-white/5 p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Seu Nome</label>
            <input
              type="text"
              className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold"
              placeholder="Ex: João Silva"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
            <input
              type="password"
              className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold"
              placeholder="Sua senha"
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>
          {error && (
            <p className="text-[10px] text-red-400 font-bold text-center uppercase tracking-widest">{error}</p>
          )}
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl py-7 font-bold shadow-lg shadow-amber-500/20"
            onClick={handleLogin}
            disabled={loading || !name || !pass}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-[9px] text-center text-zinc-600 font-medium">
            Seu acesso foi cadastrado pelo administrador.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientBooking />} />
        <Route path="/agendar/:slug" element={<ClientBooking />} />
        <Route path="/agendar" element={<Navigate to="/" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/pro/login" element={<ProfessionalLogin />} />
        <Route path="/pro" element={<ProfessionalDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
