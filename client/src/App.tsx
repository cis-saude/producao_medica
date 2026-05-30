import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppAuthProvider, useAppAuth } from "./contexts/AppAuthContext";
import Home from "./pages/Home";
import Relatorios from "./pages/Relatorios";
import Importar from "./pages/Importar";
import Importacoes from "./pages/Importacoes";
import Usuarios from "./pages/Usuarios";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";

// Rotas que não exigem autenticação
const PUBLIC_ROUTES = ["/login", "/recuperar-senha", "/redefinir-senha"];

function ProtectedRoute({ component: Component, adminOnly = false }: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAppAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="h-8 w-8 border-2 border-[#1a5c3a]/30 border-t-[#1a5c3a] rounded-full animate-spin" />
      </div>
    );
  }

  // Não autenticado → vai para login
  if (!user) {
    setTimeout(() => setLocation("/login"), 0);
    return null;
  }

  // Senha temporária → vai para primeiro acesso (exceto se já estiver lá)
  if (user.senhaTemporaria) {
    setTimeout(() => setLocation("/primeiro-acesso"), 0);
    return null;
  }

  // Rota exclusiva de admin
  if (adminOnly && user.perfil !== "admin") {
    setTimeout(() => setLocation("/"), 0);
    return null;
  }

  return <Component />;
}

function Router() {
  const { user, loading } = useAppAuth();
  const [location, setLocation] = useLocation();

  // Usuário autenticado e sem senha temporária tentando acessar rota pública → home
  if (!loading && user && !user.senhaTemporaria && PUBLIC_ROUTES.some(r => location.startsWith(r))) {
    setTimeout(() => setLocation("/"), 0);
    return null;
  }

  // Usuário autenticado com senha temporária tentando acessar rota pública → primeiro-acesso
  if (!loading && user && user.senhaTemporaria && PUBLIC_ROUTES.some(r => location.startsWith(r))) {
    setTimeout(() => setLocation("/primeiro-acesso"), 0);
    return null;
  }

  return (
    <Switch>
      {/* Rotas públicas */}
      <Route path="/login" component={Login} />
      <Route path="/recuperar-senha" component={RecuperarSenha} />
      <Route path="/redefinir-senha" component={RedefinirSenha} />

      {/* Rota de primeiro acesso — acessível apenas para usuários autenticados com senhaTemporaria */}
      <Route path="/primeiro-acesso" component={PrimeiroAcesso} />

      {/* Rotas protegidas */}
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/relatorios" component={() => <ProtectedRoute component={Relatorios} />} />
      <Route path="/importar" component={() => <ProtectedRoute component={Importar} adminOnly={true} />} />
      <Route path="/importacoes" component={() => <ProtectedRoute component={Importacoes} />} />
      <Route path="/usuarios" component={() => <ProtectedRoute component={Usuarios} adminOnly={true} />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AppAuthProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </TooltipProvider>
        </AppAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
