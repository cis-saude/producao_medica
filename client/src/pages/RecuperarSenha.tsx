import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663511783698/km5HGqraVtA5EFgcREPofK/GRUPOCIS-MARCAFUNDOBRANCO_2f1ea2e7.webp";

export default function RecuperarSenha() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!email) {
      setErro("Informe seu e-mail.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/app/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnviado(true);
        if (data.previewUrl) setPreviewUrl(data.previewUrl);
      } else {
        setErro(data.error || "Erro ao processar solicitação.");
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
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1a5c3a] to-[#2d7a52] px-8 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-xl p-3 shadow-lg">
                <img src={LOGO_URL} alt="Grupo CIS" className="h-12 w-auto object-contain" />
              </div>
            </div>
            <h1 className="text-white text-xl font-bold">Recuperar Senha</h1>
            <p className="text-white/70 text-sm mt-1">Dashboard de Plantões — Grupo CIS</p>
          </div>

          <div className="px-8 py-8">
            {enviado ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 rounded-full p-4">
                    <CheckCircle2 size={40} className="text-green-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">E-mail enviado!</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
                </p>
                {previewUrl && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <strong>Modo de desenvolvimento:</strong>{" "}
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="underline">
                      Ver e-mail de teste
                    </a>
                  </div>
                )}
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full h-11 bg-[#1a5c3a] hover:bg-[#0d3d24] text-white font-semibold"
                >
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-2 text-center">Esqueceu sua senha?</h2>
                <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                  Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</Label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com.br"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-11 pl-9"
                        disabled={loading}
                      />
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
                        Enviando...
                      </span>
                    ) : "Enviar Link de Recuperação"}
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <button
                    onClick={() => setLocation("/login")}
                    className="text-sm text-gray-500 hover:text-[#1a5c3a] flex items-center gap-1.5 mx-auto transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Voltar ao login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
