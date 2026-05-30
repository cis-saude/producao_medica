import express from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  criarAppUser,
  getAppUserByEmail,
  getAppUserById,
  listarAppUsers,
  atualizarAppUser,
  desativarAppUser,
  verificarSenha,
  gerarTokenRecuperacao,
  redefinirSenhaComToken,
  getAppUserByToken,
  registrarUltimoLogin,
  seedAdminSeNecessario,
} from "./authDb";
import { signAppUserToken, verifyAppUserToken } from "./authJwt";
import { enviarEmailRecuperacaoSenha, enviarEmailBoasVindas } from "./mailer";

const COOKIE_NAME = "app_session";
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8 horas

// Middleware: extrai usuário do cookie JWT
export async function appAuthMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const payload = await verifyAppUserToken(token);
    if (payload) {
      (req as any).appUser = payload;
    }
  }
  next();
}

// Middleware: exige autenticação
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!(req as any).appUser) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

// Middleware: exige perfil admin
export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).appUser;
  if (!user || user.perfil !== "admin") {
    res.status(403).json({ error: "Acesso negado. Apenas administradores podem realizar esta ação." });
    return;
  }
  next();
}

export function registerAuthRoutes(app: express.Express) {
  // Seed do admin inicial na inicialização
  seedAdminSeNecessario().catch(console.error);

  // Cookie parser simples (sem dependência extra)
  app.use((req, _res, next) => {
    if (!req.cookies) {
      const cookieHeader = req.headers.cookie || "";
      const cookies: Record<string, string> = {};
      cookieHeader.split(";").forEach(part => {
        const [k, ...v] = part.trim().split("=");
        if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
      });
      req.cookies = cookies;
    }
    next();
  });

  // Aplicar middleware de autenticação em todas as rotas /api/app/
  app.use("/api/app", appAuthMiddleware);

  // ---- POST /api/app/auth/login ----
  app.post("/api/app/auth/login", async (req, res) => {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        res.status(400).json({ error: "E-mail e senha são obrigatórios" });
        return;
      }
      const user = await getAppUserByEmail(email);
      if (!user || !user.ativo) {
        res.status(401).json({ error: "E-mail ou senha inválidos" });
        return;
      }
      const senhaOk = await verificarSenha(senha, user.senhaHash);
      if (!senhaOk) {
        res.status(401).json({ error: "E-mail ou senha inválidos" });
        return;
      }
      await registrarUltimoLogin(user.id);
      const token = await signAppUserToken({
        sub: String(user.id),
        email: user.email,
        nome: user.nome,
        perfil: user.perfil,
      });
      res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: COOKIE_MAX_AGE });
      res.json({
        success: true,
        user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, senhaTemporaria: user.senhaTemporaria },
      });
    } catch (err: any) {
      console.error("[Auth] Login error:", err);
      res.status(500).json({ error: "Erro interno ao fazer login" });
    }
  });

  // ---- POST /api/app/auth/logout ----
  app.post("/api/app/auth/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ success: true });
  });

  // ---- GET /api/app/auth/me ----
  app.get("/api/app/auth/me", requireAuth, async (req, res) => {
    const payload = (req as any).appUser;
    const user = await getAppUserById(Number(payload.sub));
    if (!user || !user.ativo) {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      res.status(401).json({ error: "Sessão inválida" });
      return;
    }
    res.json({ id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, senhaTemporaria: user.senhaTemporaria });
  });

  // ---- PUT /api/app/auth/definir-senha (primeiro acesso, sem exigir senha atual) ----
  app.put("/api/app/auth/definir-senha", requireAuth, async (req, res) => {
    try {
      const { novaSenha } = req.body;
      const payload = (req as any).appUser;
      if (!novaSenha || novaSenha.length < 6) {
        res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
        return;
      }
      const user = await getAppUserById(Number(payload.sub));
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }
      await atualizarAppUser(user.id, { senha: novaSenha, senhaTemporaria: false });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- POST /api/app/auth/recuperar-senha ----
  app.post("/api/app/auth/recuperar-senha", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "E-mail é obrigatório" });
        return;
      }
      const token = await gerarTokenRecuperacao(email);
      if (!token) {
        // Não revelar se o e-mail existe ou não (segurança)
        res.json({ success: true, message: "Se o e-mail estiver cadastrado, você receberá as instruções em breve." });
        return;
      }
      const user = await getAppUserByEmail(email);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const result = await enviarEmailRecuperacaoSenha(email, user!.nome, token, baseUrl);
      // Em desenvolvimento, retornar URL de preview para facilitar testes
      const extra = process.env.NODE_ENV !== "production" && result.previewUrl
        ? { previewUrl: result.previewUrl }
        : {};
      res.json({
        success: true,
        message: "Se o e-mail estiver cadastrado, você receberá as instruções em breve.",
        ...extra,
      });
    } catch (err: any) {
      console.error("[Auth] Recuperar senha error:", err);
      res.status(500).json({ error: "Erro ao processar solicitação" });
    }
  });

  // ---- POST /api/app/auth/redefinir-senha ----
  app.post("/api/app/auth/redefinir-senha", async (req, res) => {
    try {
      const { token, novaSenha } = req.body;
      if (!token || !novaSenha) {
        res.status(400).json({ error: "Token e nova senha são obrigatórios" });
        return;
      }
      if (novaSenha.length < 6) {
        res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
        return;
      }
      const ok = await redefinirSenhaComToken(token, novaSenha);
      if (!ok) {
        res.status(400).json({ error: "Token inválido ou expirado" });
        return;
      }
      res.json({ success: true, message: "Senha redefinida com sucesso" });
    } catch (err: any) {
      console.error("[Auth] Redefinir senha error:", err);
      res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  });

  // ---- GET /api/app/auth/validar-token ----
  app.get("/api/app/auth/validar-token", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      res.status(400).json({ valid: false });
      return;
    }
    const user = await getAppUserByToken(token);
    if (!user || !user.tokenExpira || new Date() > user.tokenExpira) {
      res.json({ valid: false });
      return;
    }
    res.json({ valid: true, nome: user.nome });
  });

  // ---- GET /api/app/usuarios (admin) ----
  app.get("/api/app/usuarios", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const users = await listarAppUsers();
      res.json(users.map(u => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        perfil: u.perfil,
        ativo: u.ativo,
        senhaTemporaria: u.senhaTemporaria,
        ultimoLogin: u.ultimoLogin,
        createdAt: u.createdAt,
        criadoPor: u.criadoPor,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- POST /api/app/usuarios (admin cria usuário) ----
  app.post("/api/app/usuarios", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { nome, email, perfil, senha, enviarEmail } = req.body;
      if (!nome || !email || !perfil) {
        res.status(400).json({ error: "Nome, e-mail e perfil são obrigatórios" });
        return;
      }
      if (!["admin", "visualizacao"].includes(perfil)) {
        res.status(400).json({ error: "Perfil inválido" });
        return;
      }
      if (!senha || senha.length < 6) {
        res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
        return;
      }
      // Verificar se e-mail já existe
      const existente = await getAppUserByEmail(email);
      if (existente) {
        res.status(409).json({ error: "Já existe um usuário com este e-mail" });
        return;
      }
      const user = await criarAppUser({
        nome,
        email,
        senha, // senha definida pelo admin
        perfil,
        senhaTemporaria: true, // usuário deve trocar no 1º acesso
        criadoPor: (req as any).appUser?.sub ? Number((req as any).appUser.sub) : undefined,
      });
      // Tentar enviar e-mail de boas-vindas (opcional)
      let previewUrl: string | undefined;
      if (enviarEmail === true) {
        const baseUrl = req.headers.origin || `${req.protocol}://${req.get("host")}`;
        const result = await enviarEmailBoasVindas(email, nome, senha, baseUrl);
        previewUrl = result?.previewUrl;
      }
      res.json({
        success: true,
        user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
        previewUrl,
      });
    } catch (err: any) {
      if (err.message?.includes("Duplicate")) {
        res.status(409).json({ error: "Já existe um usuário com este e-mail" });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // ---- PUT /api/app/usuarios/:id (admin edita usuário) ----
  app.put("/api/app/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { nome, email, perfil, ativo, senha, senhaTemporaria } = req.body;
      const updateData: Parameters<typeof atualizarAppUser>[1] = {};
      if (nome !== undefined) updateData.nome = nome;
      if (email !== undefined) updateData.email = email;
      if (perfil !== undefined) updateData.perfil = perfil;
      if (ativo !== undefined) updateData.ativo = ativo;
      if (senha !== undefined) updateData.senha = senha;
      if (senhaTemporaria !== undefined) updateData.senhaTemporaria = senhaTemporaria;
      await atualizarAppUser(id, updateData);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- DELETE /api/app/usuarios/:id (admin desativa usuário) ----
  app.delete("/api/app/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const admin = (req as any).appUser;
      if (Number(admin.sub) === id) {
        res.status(400).json({ error: "Você não pode desativar sua própria conta" });
        return;
      }
      await desativarAppUser(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- PUT /api/app/auth/alterar-senha (usuário altera própria senha) ----
  app.put("/api/app/auth/alterar-senha", requireAuth, async (req, res) => {
    try {
      const { senhaAtual, novaSenha } = req.body;
      const payload = (req as any).appUser;
      if (!senhaAtual || !novaSenha) {
        res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
        return;
      }
      if (novaSenha.length < 6) {
        res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" });
        return;
      }
      const user = await getAppUserById(Number(payload.sub));
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }
      const senhaOk = await verificarSenha(senhaAtual, user.senhaHash);
      if (!senhaOk) {
        res.status(400).json({ error: "Senha atual incorreta" });
        return;
      }
      await atualizarAppUser(user.id, { senha: novaSenha });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

function gerarSenhaTemporaria(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
  let senha = "";
  for (let i = 0; i < 10; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}
