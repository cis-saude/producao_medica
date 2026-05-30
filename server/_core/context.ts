import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyAppUserToken, type AppUserJwtPayload } from "../authJwt";

const COOKIE_NAME = "app_session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AppUserJwtPayload | null;
};

/**
 * Lê manualmente o cookie da requisição (sem dependência de cookie-parser).
 * Equivalente ao parser usado em authRoutes.ts.
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) result[k.trim()] = decodeURIComponent(v.join("="));
  });
  return result;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AppUserJwtPayload | null = null;

  const cookies =
    (opts.req as any).cookies ?? parseCookies(opts.req.headers.cookie);
  const token = cookies[COOKIE_NAME];

  if (token) {
    user = await verifyAppUserToken(token);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
