import { useState, CSSProperties, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { LayoutDashboard, FileSpreadsheet, Upload, BarChart3, LogOut, PanelLeft, Users, KeyRound } from "lucide-react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663511783698/km5HGqraVtA5EFgcREPofK/GRUPOCIS-MARCAFUNDOBRANCO_2f1ea2e7.webp";

const ALL_MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", adminOnly: false },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", adminOnly: false },
  { icon: Upload, label: "Importar Planilha", path: "/importar", adminOnly: true },
  { icon: FileSpreadsheet, label: "Histórico", path: "/importacoes", adminOnly: false },
  { icon: Users, label: "Usuários", path: "/usuarios", adminOnly: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading } = useAppAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (w: number) => void }) {
  const { user, logout } = useAppAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Modal alterar senha
  const [senhaModal, setSenhaModal] = useState(false);
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  // Filtrar menu pelo perfil do usuário
  const menuItems = ALL_MENU_ITEMS.filter(item => !item.adminOnly || user?.perfil === "admin");
  const activeMenuItem = menuItems.find(item => item.path === location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

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

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="bg-white rounded p-0.5 shrink-0">
                    <img src={LOGO_URL} alt="CIS" className="h-6 w-auto object-contain" />
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 pt-2">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-medium"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-bold bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.nome?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.nome || "-"}</p>
                      <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || "-"}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {!isCollapsed && user && (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-foreground truncate">{user.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user.perfil === "admin" ? "Administrador" : "Visualização"}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setSenhaModal(true)} className="cursor-pointer gap-2">
                  <KeyRound className="h-4 w-4" />
                  <span>Alterar Senha</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>
      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-card px-4 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-semibold text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
            <img src={LOGO_URL} alt="CIS" className="h-7 w-auto object-contain" />
          </div>
        )}
        <main className="flex-1">{children}</main>
      </SidebarInset>

      {/* Modal alterar senha */}
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
    </>
  );
}
