import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663511783698/km5HGqraVtA5EFgcREPofK/GRUPOCIS-MARCAFUNDOBRANCO_2f1ea2e7.webp";

export default function RedefinirSenha() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";

  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) {
      setTokenValido(false);
      return;
    }
    fetch(`/api/app/auth/validar-token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        setTokenValido(data.valid);
        if (data.nome) setNomeUsuario(data.nome);
      })
      .catch(() => setTokenValido(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (novaSenha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/app/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json();
      if (res.ok) {
        setConcluido(true);
      } else {
        setErro(data.error || "Erro ao redefinir senha.");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d3d24] via-[#1a5c3a] to-[#0d3d24] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a5c3a] to-[#2d7a52] px-8 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-xl p-3 shadow-lg">
                <img src={LOGO_URL} alt="Grupo CIS" className="h-12 w-auto object-contain" />
              </div>
            </div>
            <h1 className="text-white text-xl font-bold">Redefinir Senha</h1>
            <p className="text-white/70 text-sm mt-1">Dashboard de Plantões — Grupo CIS</p>
          </div>

          <div className="px-8 py-8">
            {tokenValido === null && (
              <div className="text-center py-8">
                <span className="h-8 w-8 border-2 border-[#1a5c3a]/30 border-t-[#1a5c3a] rounded-full animate-spin inline-block" />
                <p className="text-sm text-gray-500 mt-3">Validando link...</p>
              </div>
            )}

            {tokenValido === false && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-red-100 rounded-full p-4">
                    <XCircle size={40} className="text-red-500" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Link inválido ou expirado</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Este link de redefinição de senha é inválido ou já expirou. Solicite um novo link.
                </p>
                <Button
                  onClick={() => setLocation("/recuperar-senha")}
                  className="w-full h-11 bg-[#1a5c3a] hover:bg-[#0d3d24] text-white font-semibold"
                >
                  Solicitar Novo Link
                </Button>
              </div>
            )}

            {tokenValido === true && concluido && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 rounded-full p-4">
                    <CheckCircle2 size={40} className="text-green-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Senha redefinida!</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
                </p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full h-11 bg-[#1a5c3a] hover:bg-[#0d3d24] text-white font-semibold"
                >
                  Ir para o Login
                </Button>
              </div>
            )}

            {tokenValido === true && !concluido && (
              <>
                {nomeUsuario && (
                  <p className="text-sm text-gray-600 text-center mb-6">
                    Olá, <strong>{nomeUsuario}</strong>! Crie uma nova senha para sua conta.
                  </p>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="novaSenha" className="text-sm font-medium text-gray-700">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="novaSenha"
                        type={showNova ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={novaSenha}
                        onChange={e => setNovaSenha(e.target.value)}
                        className="h-11 pr-10"
                        disabled={loading}
                      />
                      <button type="button" onClick={() => setShowNova(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        {showNova ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmarSenha" className="text-sm font-medium text-gray-700">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmarSenha"
                        type={showConfirmar ? "text" : "password"}
                        placeholder="Repita a nova senha"
                        value={confirmarSenha}
                        onChange={e => setConfirmarSenha(e.target.value)}
                        className="h-11 pr-10"
                        disabled={loading}
                      />
                      <button type="button" onClick={() => setShowConfirmar(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {erro && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                      {erro}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-[#1a5c3a] hover:bg-[#0d3d24] text-white font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </span>
                    ) : "Salvar Nova Senha"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
