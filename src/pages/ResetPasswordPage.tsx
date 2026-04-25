import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [info, setInfo] = useState<{ email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("Link inválido."); setLoading(false); return; }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInfo(data);
      })
      .catch(() => setError("Erro ao validar o link."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    if (password.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error || "Erro ao redefinir senha.");
      else { setDone(true); setTimeout(() => navigate("/login"), 3000); }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 w-full max-w-md">

        {done ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-zinc-900 mb-2">Senha redefinida!</h2>
            <p className="text-zinc-500 text-sm">Redirecionando para o login...</p>
          </div>

        ) : error && !info ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-black text-zinc-900 mb-2">Link inválido</h2>
            <p className="text-zinc-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-bold text-amber-500 hover:text-amber-600 transition-colors"
            >
              Voltar ao login
            </button>
          </div>

        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black text-zinc-900">Nova senha</h1>
              {info && (
                <p className="text-zinc-500 text-sm mt-2">
                  Redefina a senha de <strong>{info.email}</strong>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full text-sm p-3.5 pr-12 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPass ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                  Confirmar nova senha
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  className="w-full text-sm p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all placeholder:text-zinc-400"
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !password || !confirm}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : "Salvar nova senha"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors py-1"
              >
                Voltar ao login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
