import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashSenha, verificarSenha } from "./authDb";
import { signAppUserToken, verifyAppUserToken } from "./authJwt";

// Mock do getDb para não precisar de banco real
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock do ENV
vi.mock("./_core/env", () => ({
  ENV: {
    cookieSecret: "test-secret-for-unit-tests-only",
    ownerOpenId: "test-owner",
  },
}));

describe("authDb — hashSenha / verificarSenha", () => {
  it("deve gerar um hash diferente da senha original", async () => {
    const senha = "MinhaSenh@123";
    const hash = await hashSenha(senha);
    expect(hash).not.toBe(senha);
    expect(hash.length).toBeGreaterThan(20);
  });

  it("deve verificar corretamente uma senha válida", async () => {
    const senha = "SenhaCorreta!456";
    const hash = await hashSenha(senha);
    const ok = await verificarSenha(senha, hash);
    expect(ok).toBe(true);
  });

  it("deve rejeitar uma senha incorreta", async () => {
    const hash = await hashSenha("SenhaCorreta");
    const ok = await verificarSenha("SenhaErrada", hash);
    expect(ok).toBe(false);
  });

  it("hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const senha = "MesmaSenha";
    const hash1 = await hashSenha(senha);
    const hash2 = await hashSenha(senha);
    expect(hash1).not.toBe(hash2);
  });
});

describe("authJwt — signAppUserToken / verifyAppUserToken", () => {
  const payload = {
    sub: "42",
    email: "teste@cissaude.com.br",
    nome: "Usuário Teste",
    perfil: "admin" as const,
  };

  it("deve gerar um token JWT válido", async () => {
    const token = await signAppUserToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature
  });

  it("deve verificar e retornar o payload correto", async () => {
    const token = await signAppUserToken(payload);
    const decoded = await verifyAppUserToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe("42");
    expect(decoded?.email).toBe("teste@cissaude.com.br");
    expect(decoded?.perfil).toBe("admin");
  });

  it("deve retornar null para token inválido", async () => {
    const decoded = await verifyAppUserToken("token.invalido.aqui");
    expect(decoded).toBeNull();
  });

  it("deve retornar null para token adulterado", async () => {
    const token = await signAppUserToken(payload);
    const partes = token.split(".");
    partes[1] = Buffer.from(JSON.stringify({ sub: "999", perfil: "admin" })).toString("base64url");
    const adulterado = partes.join(".");
    const decoded = await verifyAppUserToken(adulterado);
    expect(decoded).toBeNull();
  });

  it("deve incluir perfil visualizacao no token", async () => {
    const token = await signAppUserToken({ ...payload, perfil: "visualizacao" });
    const decoded = await verifyAppUserToken(token);
    expect(decoded?.perfil).toBe("visualizacao");
  });
});
