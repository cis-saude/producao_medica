import { useState } from "react";
import { useLocation } from "wouter";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Eye, EyeOff } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663511783698/km5HGqraVtA5EFgcREPofK/GRUPOCIS-MARCAFUNDOBRANCO_2f1ea2e7.webp";

export default function PrimeiroAcesso() {
  const { user, refreshUser } = useAppAuth();
  const [, setLocation] = useLocation();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (novaSenha !== confirmar) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/app/auth/definir-senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ novaSenha }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Senha definida com sucesso! Bem-vindo ao sistema.");
        await refreshUser();
        setLocation("/");
      } else {
        toast.error(data.error || "Erro ao definir senha");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a5c3a] px-4">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6 gap-3">
          <div className="bg-white rounded-xl px-6 py-3 shadow-lg">
            <img src={LOGO_URL} alt="Grupo CIS" className="h-12 w-auto object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-white text-xl font-bold">Dashboard de Plantões</h1>
            <p className="text-white/70 text-sm">Grupo CIS — Soluções Integradas em Saúde</p>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="h-12 w-12 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-[#1a5c3a]" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Defina sua senha</h2>
            <p className="text-sm text-muted-foreground text-center">
              {user?.nome ? `Olá, ${user.nome.split(" ")[0]}!` : "Olá!"} Este é seu primeiro acesso. Por segurança, crie uma senha pessoal para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <div className="relative">
                <Input
                  id="novaSenha"
                  type={mostrarNova ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  required
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setMostrarNova(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {mostrarNova ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmar"
                  type={mostrarConfirmar ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {mostrarConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Indicador de força */}
            {novaSenha.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(n => (
                    <div
                      key={n}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        novaSenha.length >= n * 3
                          ? n <= 1 ? "bg-red-400" : n <= 2 ? "bg-yellow-400" : n <= 3 ? "bg-blue-400" : "bg-emerald-500"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {novaSenha.length < 6 ? "Senha muito curta" :
                   novaSenha.length < 9 ? "Senha fraca" :
                   novaSenha.length < 12 ? "Senha razoável" : "Senha forte"}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={salvando || novaSenha.length < 6 || novaSenha !== confirmar}
              className="w-full bg-[#1a5c3a] hover:bg-[#0d3d24] text-white h-11 font-semibold mt-2"
            >
              {salvando ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <KeyRound size={16} />
                  Definir Senha e Entrar
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          © {new Date().getFullYear()} Grupo CIS — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
