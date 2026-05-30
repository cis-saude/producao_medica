import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";

const ALG = "HS256";
const EXPIRES_IN = "8h";

function getSecret() {
  const secret = ENV.cookieSecret || "fallback-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export interface AppUserJwtPayload {
  sub: string;       // user id (string)
  email: string;
  nome: string;
  perfil: "admin" | "visualizacao";
}

export async function signAppUserToken(payload: AppUserJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret());
}

export async function verifyAppUserToken(token: string): Promise<AppUserJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AppUserJwtPayload;
  } catch {
    return null;
  }
}
