import { useState } from "react";
import { useLocation } from "wouter";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663511783698/km5HGqraVtA5EFgcREPofK/GRUPOCIS-MARCAFUNDOBRANCO_2f1ea2e7.webp";

export default function Login() {
  const { login } = useAppAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!email || !senha) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }
    setLoading(true);
    const result = await login(email, senha);
    setLoading(false);
    if (result.success) {
      setLocation("/");
    } else {
      setErro(result.error || "E-mail ou senha inválidos.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d3d24] via-[#1a5c3a] to-[#0d3d24] p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1a5c3a] to-[#2d7a52] px-8 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-xl p-3 shadow-lg">
                <img src={LOGO_URL} alt="Grupo CIS" className="h-12 w-auto object-contain" />
              </div>
            </div>
            <h1 className="text-white text-xl font-bold">Dashboard de Plantões</h1>
            <p className="text-white/70 text-sm mt-1">Grupo CIS — Soluções Integradas em Saúde</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">Acesse sua conta</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com.br"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-sm font-medium text-gray-700">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
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
                className="w-full h-11 bg-[#1a5c3a] hover:bg-[#0d3d24] text-white font-semibold text-sm gap-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn size={16} />
                    Entrar
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button
                onClick={() => setLocation("/recuperar-senha")}
                className="text-sm text-[#1a5c3a] hover:underline font-medium"
              >
                Esqueci minha senha
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © {new Date().getFullYear()} Grupo CIS — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
