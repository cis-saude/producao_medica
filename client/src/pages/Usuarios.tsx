import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { UserPlus, MoreVertical, Pencil, UserX, UserCheck, ShieldCheck, Eye, RefreshCw, KeyRound, EyeOff } from "lucide-react";

interface AppUser {
  id: number;
  nome: string;
  email: string;
  perfil: "admin" | "visualizacao";
  ativo: boolean;
  senhaTemporaria?: boolean;
  ultimoLogin: string | null;
  createdAt: string;
}

export default function Usuarios() {
  const { user } = useAppAuth();
  const [, setLocation] = useLocation();
  const [usuarios, setUsuarios] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<AppUser | null>(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    perfil: "visualizacao" as "admin" | "visualizacao",
    senha: "",
    confirmarSenha: "",
    redefinirSenha: false, // na edição: flag para mostrar campos de senha
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Modal alterar minha própria senha
  const [senhaModal, setSenhaModal] = useState(false);
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  // Redirecionar se não for admin
  useEffect(() => {
    if (user && user.perfil !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/app/usuarios", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const abrirCriar = () => {
    setEditando(null);
    setForm({ nome: "", email: "", perfil: "visualizacao", senha: "", confirmarSenha: "", redefinirSenha: false });
    setMostrarSenha(false);
    setMostrarConfirmar(false);
    setModalAberto(true);
  };

  const abrirEditar = (u: AppUser) => {
    setEditando(u);
    setForm({ nome: u.nome, email: u.email, perfil: u.perfil, senha: "", confirmarSenha: "", redefinirSenha: false });
    setMostrarSenha(false);
    setMostrarConfirmar(false);
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.nome || !form.email) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    // Validação de senha na criação (obrigatória)
    if (!editando) {
      if (!form.senha) {
        toast.error("Defina uma senha para o novo usuário");
        return;
      }
      if (form.senha.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      if (form.senha !== form.confirmarSenha) {
        toast.error("As senhas não coincidem");
        return;
      }
    }
    // Validação de senha na edição (opcional, mas se preenchida deve ser válida)
    if (editando && form.redefinirSenha) {
      if (!form.senha) {
        toast.error("Digite a nova senha");
        return;
      }
      if (form.senha.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      if (form.senha !== form.confirmarSenha) {
        toast.error("As senhas não coincidem");
        return;
      }
    }

    setSalvando(true);
    try {
      if (editando) {
        const body: Record<string, unknown> = {
          nome: form.nome,
          perfil: form.perfil,
        };
        if (form.redefinirSenha && form.senha) {
          body.senha = form.senha;
          body.senhaTemporaria = true; // admin redefiniu → usuário troca no próximo acesso
        }
        const res = await fetch(`/api/app/usuarios/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success(form.redefinirSenha && form.senha
            ? "Usuário atualizado e senha redefinida. O usuário deverá criar uma nova senha no próximo acesso."
            : "Usuário atualizado com sucesso");
          setModalAberto(false);
          carregarUsuarios();
        } else {
          const data = await res.json();
          toast.error(data.error || "Erro ao atualizar usuário");
        }
      } else {
        const res = await fetch("/api/app/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            nome: form.nome,
            email: form.email,
            perfil: form.perfil,
            senha: form.senha,
            enviarEmail: false,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Usuário "${form.nome}" criado com sucesso! Compartilhe a senha definida com ele.`);
          setModalAberto(false);
          carregarUsuarios();
        } else {
          toast.error(data.error || "Erro ao criar usuário");
        }
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (u: AppUser) => {
    try {
      if (u.ativo) {
        const res = await fetch(`/api/app/usuarios/${u.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          toast.success(`Usuário ${u.nome} desativado`);
          carregarUsuarios();
        } else {
          const data = await res.json();
          toast.error(data.error || "Erro ao desativar usuário");
        }
      } else {
        const res = await fetch(`/api/app/usuarios/${u.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ativo: true }),
        });
        if (res.ok) {
          toast.success(`Usuário ${u.nome} reativado`);
          carregarUsuarios();
        } else {
          toast.error("Erro ao reativar usuário");
        }
      }
    } catch {
      toast.error("Erro de conexão");
    }
  };

  const salvarSenha = async () => {
    if (!senhaForm.senhaAtual || !senhaForm.novaSenha) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (senhaForm.novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (senhaForm.novaSenha !== senhaForm.confirmar) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSalvandoSenha(true);
    try {
      const res = await fetch("/api/app/auth/alterar-senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senhaAtual: senhaForm.senhaAtual, novaSenha: senhaForm.novaSenha }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Senha alterada com sucesso");
        setSenhaModal(false);
        setSenhaForm({ senhaAtual: "", novaSenha: "", confirmar: "" });
      } else {
        toast.error(data.error || "Erro ao alterar senha");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSalvandoSenha(false);
    }
  };

  const formatarData = (d: string | null) => {
    if (!d) return "Nunca";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (user?.perfil !== "admin") return null;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">Gerenciamento de Usuários</h1>
            <p className="text-xs text-muted-foreground">Cadastre e gerencie os usuários com acesso ao sistema</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSenhaModal(true)} className="h-9 text-xs gap-1.5">
              <KeyRound size={14} />
              Alterar Minha Senha
            </Button>
            <Button size="sm" onClick={abrirCriar} className="h-9 text-xs gap-1.5 bg-[#1a5c3a] hover:bg-[#0d3d24]">
              <UserPlus size={14} />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              {loading ? "Carregando..." : `${usuarios.length} usuário${usuarios.length !== 1 ? "s" : ""} cadastrado${usuarios.length !== 1 ? "s" : ""}`}
            </span>
            <Button variant="ghost" size="sm" onClick={carregarUsuarios} className="h-8 w-8 p-0">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">E-mail</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Perfil</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Último Acesso</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cadastrado em</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                ) : (
                  usuarios.map(u => (
                    <tr key={u.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${!u.ativo ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{u.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        {u.perfil === "admin" ? (
                          <Badge className="bg-[#1a5c3a]/10 text-[#1a5c3a] border-[#1a5c3a]/20 gap-1 text-xs">
                            <ShieldCheck size={11} /> Administrador
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                            <Eye size={11} /> Visualização
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {u.ativo ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Ativo</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">Inativo</Badge>
                          )}
                          {u.senhaTemporaria && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
                              <KeyRound size={9} /> Aguardando 1º acesso
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatarData(u.ultimoLogin)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatarData(u.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        {u.id !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => abrirEditar(u)} className="gap-2 cursor-pointer">
                                <Pencil size={13} /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleAtivo(u)}
                                className={`gap-2 cursor-pointer ${u.ativo ? "text-red-600 focus:text-red-600" : "text-emerald-600 focus:text-emerald-600"}`}
                              >
                                {u.ativo ? <><UserX size={13} /> Desativar</> : <><UserCheck size={13} /> Reativar</>}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {u.id === user?.id && (
                          <span className="text-xs text-muted-foreground italic">Você</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal criar/editar usuário */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                placeholder="Nome do usuário"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="email@cissaude.com.br"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                disabled={!!editando}
              />
            </div>

            {/* Perfil */}
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.perfil} onValueChange={v => setForm(f => ({ ...f, perfil: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visualizacao">
                    <span className="flex items-center gap-2"><Eye size={13} /> Visualização</span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2"><ShieldCheck size={13} /> Administrador</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {form.perfil === "admin"
                  ? "Acesso completo: dashboard, relatórios, importação de planilhas e gerenciamento de usuários."
                  : "Acesso somente leitura: dashboard e relatórios. Não pode importar planilhas."}
              </p>
            </div>

            {/* Senha — obrigatória na criação, opcional na edição */}
            {editando ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Redefinir senha</Label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, redefinirSenha: !f.redefinirSenha, senha: "", confirmarSenha: "" }))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      form.redefinirSenha
                        ? "bg-[#1a5c3a]/10 text-[#1a5c3a] border-[#1a5c3a]/30"
                        : "bg-muted text-muted-foreground border-border hover:border-[#1a5c3a]/30"
                    }`}
                  >
                    {form.redefinirSenha ? "Cancelar redefinição" : "Redefinir senha"}
                  </button>
                </div>
                {form.redefinirSenha && (
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-xs text-amber-700">
                      O usuário será obrigado a criar uma nova senha no próximo acesso.
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nova senha</Label>
                      <div className="relative">
                        <Input
                          type={mostrarSenha ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={form.senha}
                          onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setMostrarSenha(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                          {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Confirmar nova senha</Label>
                      <div className="relative">
                        <Input
                          type={mostrarConfirmar ? "text" : "password"}
                          placeholder="Repita a nova senha"
                          value={form.confirmarSenha}
                          onChange={e => setForm(f => ({ ...f, confirmarSenha: e.target.value }))}
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setMostrarConfirmar(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                          {mostrarConfirmar ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Defina a senha inicial. O usuário será solicitado a criar uma senha pessoal no primeiro acesso.
                </div>
                <div className="space-y-1.5">
                  <Label>Senha inicial <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={form.senha}
                      onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setMostrarSenha(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                      {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Confirmar senha <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type={mostrarConfirmar ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={form.confirmarSenha}
                      onChange={e => setForm(f => ({ ...f, confirmarSenha: e.target.value }))}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setMostrarConfirmar(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                      {mostrarConfirmar ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.senha && form.confirmarSenha && form.senha !== form.confirmarSenha && (
                    <p className="text-xs text-red-500">As senhas não coincidem</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)} disabled={salvando}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando} className="bg-[#1a5c3a] hover:bg-[#0d3d24] text-white">
              {salvando ? "Salvando..." : editando ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal alterar minha senha */}
      <Dialog open={senhaModal} onOpenChange={setSenhaModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Minha Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Senha atual</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={senhaForm.senhaAtual}
                onChange={e => setSenhaForm(f => ({ ...f, senhaAtual: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={senhaForm.novaSenha}
                onChange={e => setSenhaForm(f => ({ ...f, novaSenha: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                placeholder="Repita a nova senha"
                value={senhaForm.confirmar}
                onChange={e => setSenhaForm(f => ({ ...f, confirmar: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSenhaModal(false)} disabled={salvandoSenha}>Cancelar</Button>
            <Button onClick={salvarSenha} disabled={salvandoSenha} className="bg-[#1a5c3a] hover:bg-[#0d3d24] text-white">
              {salvandoSenha ? "Salvando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
