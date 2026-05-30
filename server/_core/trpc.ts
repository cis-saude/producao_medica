import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware que exige usuário autenticado (cookie app_session válido).
 * Procedures que listam/manipulam dados sensíveis devem usar isto.
 */
const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Não autenticado",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Middleware que exige perfil admin (perfil === 'admin' no app_users).
 */
export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.perfil !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acesso negado. Apenas administradores podem realizar esta ação.",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);
