import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function SetupAccountPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [tenantInfo, setTenantInfo] = useState<{
    tenantName: string;
    ownerName: string;
    ownerEmail: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Link inválido.");
      setLoading(false);
      return;
    }
    fetch(`/api/auth/setup-account?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTenantInfo(data);
      })
      .catch(() => setError("Erro ao validar o link."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Erro ao configurar a conta.");
      } else {
        setDone(true);
        setTimeout(() => navigate("/login"), 4000);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Validando link...</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Conta criada com sucesso!</h2>
          <p className="text-gray-500 text-sm">
            Você será redirecionado para o login em instantes...
          </p>
        </div>
      </div>
    );
  }

  if (error && !tenantInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="text-3xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Link inválido</h2>
          <p className="text-gray-500 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-4">
            Entre em contato com o suporte em{" "}
            <a href="mailto:contato@develoi.com.br" className="underline">
              contato@develoi.com.br
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Configure sua conta</h1>
          {tenantInfo && (
            <p className="text-gray-500 text-sm mt-2">
              Bem-vindo, <strong>{tenantInfo.ownerName}</strong>!<br />
              Crie uma senha para acessar o <strong>{tenantInfo.tenantName}</strong>.
            </p>
          )}
        </div>

        {tenantInfo && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6 text-sm text-gray-600">
            E-mail de acesso:{" "}
            <span className="font-medium text-gray-900">{tenantInfo.ownerEmail}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a senha"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {submitting ? "Criando conta..." : "Criar minha conta"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Agendelle — Sistema de Agendamento Profissional
        </p>
      </div>
    </div>
  );
}
