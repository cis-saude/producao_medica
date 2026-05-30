import { eq, and } from "drizzle-orm";
import { appUsers, InsertAppUser, AppUser } from "../drizzle/schema";
import { getDb } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

// ---- Helpers de senha ----
export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

// ---- CRUD de usuários ----
export async function criarAppUser(data: {
  nome: string;
  email: string;
  senha: string;
  perfil: "admin" | "visualizacao";
  criadoPor?: number;
  senhaTemporaria?: boolean;
}): Promise<AppUser> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const senhaHash = await hashSenha(data.senha);
  const [inserted] = await db
    .insert(appUsers)
    .values({
      nome: data.nome,
      email: data.email.toLowerCase().trim(),
      senhaHash,
      perfil: data.perfil,
      ativo: true,
      senhaTemporaria: data.senhaTemporaria ?? true, // por padrão, usuários criados por admin têm senha temporária
      criadoPor: data.criadoPor ?? null,
    })
    .returning({ id: appUsers.id });
  const user = await getAppUserById(inserted.id);
  if (!user) throw new Error("Falha ao criar usuário");
  return user;
}

export async function getAppUserById(id: number): Promise<AppUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
  return result[0];
}

export async function getAppUserByEmail(email: string): Promise<AppUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, email.toLowerCase().trim()))
    .limit(1);
  return result[0];
}

export async function listarAppUsers(): Promise<AppUser[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appUsers).orderBy(appUsers.nome);
}

export async function atualizarAppUser(
  id: number,
  data: Partial<{
    nome: string;
    email: string;
    perfil: "admin" | "visualizacao";
    ativo: boolean;
    senha: string;
    senhaTemporaria: boolean;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const updateData: Record<string, unknown> = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (data.perfil !== undefined) updateData.perfil = data.perfil;
  if (data.ativo !== undefined) updateData.ativo = data.ativo;
  if (data.senhaTemporaria !== undefined) updateData.senhaTemporaria = data.senhaTemporaria;
  if (data.senha !== undefined) {
    updateData.senhaHash = await hashSenha(data.senha);
    // Ao alterar senha explicitamente, limpar flag de temporária
    if (data.senhaTemporaria === undefined) updateData.senhaTemporaria = false;
  }
  if (Object.keys(updateData).length === 0) return;
  await db.update(appUsers).set(updateData).where(eq(appUsers.id, id));
}

export async function desativarAppUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(appUsers).set({ ativo: false }).where(eq(appUsers.id, id));
}

export async function registrarUltimoLogin(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(appUsers).set({ ultimoLogin: new Date() }).where(eq(appUsers.id, id));
}

// ---- Recuperação de senha ----
export async function gerarTokenRecuperacao(email: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const user = await getAppUserByEmail(email);
  if (!user || !user.ativo) return null;
  const token = crypto.randomBytes(48).toString("hex");
  const expira = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
  await db
    .update(appUsers)
    .set({ tokenRecuperacao: token, tokenExpira: expira })
    .where(eq(appUsers.id, user.id));
  return token;
}

export async function getAppUserByToken(token: string): Promise<AppUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.tokenRecuperacao, token))
    .limit(1);
  return result[0];
}

export async function redefinirSenhaComToken(token: string, novaSenha: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const user = await getAppUserByToken(token);
  if (!user) return false;
  if (!user.tokenExpira || new Date() > user.tokenExpira) return false;
  const senhaHash = await hashSenha(novaSenha);
  await db
    .update(appUsers)
    .set({ senhaHash, tokenRecuperacao: null, tokenExpira: null })
    .where(eq(appUsers.id, user.id));
  return true;
}

// ---- Seed do primeiro admin ----
export async function seedAdminSeNecessario(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const todos = await listarAppUsers();
  if (todos.length > 0) return; // já tem usuários
  const senhaHash = await hashSenha("Admin@2026");
  await db.insert(appUsers).values({
    nome: "Administrador",
    email: "admin@cissaude.com.br",
    senhaHash,
    perfil: "admin",
    ativo: true,
  });
  console.log("[Auth] Usuário admin inicial criado: admin@cissaude.com.br / Admin@2026");
}
