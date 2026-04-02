import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientBooking from "./pages/ClientBooking";
import AdminDashboard from "./pages/AdminDashboard";
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
            />
          </div>
          <Button className="w-full" onClick={handleLogin}>Entrar no Painel</Button>
          <p className="text-[8px] text-center text-zinc-400 uppercase">Dica: admin / admin</p>
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
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
