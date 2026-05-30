import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createImportacao, deleteImportacaoPlantoes, insertPlantoesBatch, listImportacoes,
  getPlantoes, getResumoFinanceiro, getResumoByUnidade, getResumoByEspecialidade,
  getResumoByMes, getTopMedicos, getDistinctUnidades, getDistinctEspecialidades,
  getDistinctTiposPlantao, getDistinctPeriodos, getPontualidadePorUnidade
} from "./db";
import { parseXlsxDetailed } from "./xlsxParser";
import { calcularDiasAtraso } from "./vencimento";
import multer from "multer";
import express from "express";
import { appAuthMiddleware, requireAuth, requireAdmin } from "./authRoutes";

const filterSchema = z.object({
  unidade: z.union([z.string(), z.array(z.string())]).optional(),
  mesPagamento: z.union([z.number(), z.array(z.number())]).optional(),
  anoPagamento: z.union([z.number(), z.array(z.number())]).optional(),
  especialidade: z.union([z.string(), z.array(z.string())]).optional(),
  tipoPlantao: z.union([z.string(), z.array(z.string())]).optional(),
  busca: z.string().optional(),
});

export const appRouter = router({
  plantoes: router({
    // Filtros disponíveis
    unidades: publicProcedure.query(() => getDistinctUnidades()),
    especialidades: publicProcedure.input(z.object({ unidade: z.string().optional() })).query(({ input }) => getDistinctEspecialidades(input.unidade)),
    tiposPlantao: publicProcedure.input(z.object({ unidade: z.string().optional() })).query(({ input }) => getDistinctTiposPlantao(input.unidade)),
    periodos: publicProcedure.query(() => getDistinctPeriodos()),

    // Resumo financeiro geral
    resumoFinanceiro: publicProcedure.input(filterSchema).query(({ input }) => getResumoFinanceiro(input)),

    // Resumo por unidade
    resumoByUnidade: publicProcedure.input(filterSchema).query(({ input }) => getResumoByUnidade(input)),

    // Resumo por especialidade/tipo
    resumoByEspecialidade: publicProcedure.input(filterSchema).query(({ input }) => getResumoByEspecialidade(input)),

    // Dados por mês para gráficos
    resumoByMes: publicProcedure.input(filterSchema).query(({ input }) => getResumoByMes(input)),

    // Top médicos
    topMedicos: publicProcedure.input(filterSchema.extend({ limit: z.number().optional() })).query(({ input }) => getTopMedicos(input, input.limit || 5)),

    // Pontualidade de pagamentos por unidade
    pontualidade: publicProcedure.input(filterSchema).query(({ input }) => getPontualidadePorUnidade(input)),

    // Listagem detalhada
    list: publicProcedure.input(filterSchema.extend({
      page: z.number().default(1),
      pageSize: z.number().default(50),
      status: z.enum(["todos", "pago", "em_aberto", "atrasado"]).optional(),
      statusPlanilha: z.enum(["todos", "CONCLUIDO", "PENDENTE"]).optional(),
    })).query(async ({ input }) => {
      const { page, pageSize, status, statusPlanilha, ...filter } = input;
      const all = await getPlantoes(filter);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Enriquecer cada plantão com vencimento calculado e dias de atraso
      const enriched = all
        .filter(p => Number(p.valorBruto) > 0)
        .map(p => {
          const atraso = calcularDiasAtraso(
            p.unidade,
            p.mesPagamento,
            p.anoPagamento,
            p.dataPagto ? new Date(p.dataPagto) : null,
            today
          );
          return {
            ...p,
            dataVencimento: atraso.dataVencimento,
            regraVencimento: atraso.regra,
            diasAtraso: atraso.diasAtraso,
          };
        });

      let filtered = enriched;
      // Filtro de busca por nome do médico ou razão social
      if (input.busca && input.busca.trim() !== "") {
        const termo = input.busca.trim().toLowerCase();
        filtered = filtered.filter(p =>
          (p.medico && p.medico.toLowerCase().includes(termo)) ||
          (p.razaoSocial && p.razaoSocial.toLowerCase().includes(termo))
        );
      }
      // Filtro por status da planilha (CONCLUIDO/PENDENTE)
      if (statusPlanilha && statusPlanilha !== "todos") {
        filtered = filtered.filter(p => (p as any).status === statusPlanilha);
      }
      if (status === "pago") {
        filtered = filtered.filter(p => p.dataPagto !== null);
      } else if (status === "em_aberto") {
        filtered = filtered.filter(p => p.dataPagto === null);
      } else if (status === "atrasado") {
        filtered = filtered.filter(p => {
          if (p.dataPagto !== null) return false;
          return (p.diasAtraso ?? 0) > 0;
        });
      }

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);

      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

    // Importações realizadas
    importacoes: publicProcedure.query(() => listImportacoes()),
  }),
});

export type AppRouter = typeof appRouter;

// Configurar rota de upload de arquivo (fora do tRPC)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export function registerUploadRoute(app: express.Express) {
  // ---- POST /api/preview-plantoes (analisa sem salvar) ----
  app.post("/api/preview-plantoes", appAuthMiddleware, requireAuth, requireAdmin, upload.single("file"), async (req: express.Request, res: express.Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      const parseResult = parseXlsxDetailed(req.file.buffer);
      const { sheets: parsed, errors: parseErrors } = parseResult;
      if (parsed.length === 0) {
        const errorDetails = parseErrors.length > 0
          ? parseErrors.map(e => `Aba "${e.aba}": ${e.motivo}${e.detalhes ? ` — ${e.detalhes}` : ""}`).join("\n")
          : "Nenhuma aba com dados válidos encontrada na planilha.";
        res.status(400).json({
          error: "Nenhum dado válido encontrado na planilha",
          detalhes: errorDetails,
          erros: parseErrors,
        });
        return;
      }
      // Montar preview por aba (sem persistir nada)
      const abas = parsed.map(sheet => {
        const medicos = Array.from(new Set(sheet.rows.map(r => r.medico).filter(Boolean))) as string[];
        const concluidos = sheet.rows.filter(r => (r as any).status === "CONCLUIDO").length;
        const pendentes = sheet.rows.filter(r => (r as any).status === "PENDENTE").length;
        return {
          unidade: sheet.unidade,
          unidadeNome: sheet.unidadeNome,
          mesPagamento: sheet.mesPagamento,
          anoPagamento: sheet.anoPagamento,
          totalRegistros: sheet.rows.length,
          medicos,
          concluidos,
          pendentes,
          avisos: sheet.warnings?.length || 0,
          detalhesAvisos: sheet.warnings || [],
        };
      });
      res.json({
        success: true,
        abas,
        erros: parseErrors,
        totalRegistros: parsed.reduce((s, sh) => s + sh.rows.length, 0),
        totalAbas: parsed.length,
      });
    } catch (err: any) {
      console.error("[Preview] Error:", err);
      res.status(500).json({ error: err.message || "Erro ao processar planilha" });
    }
  });

  app.post("/api/upload-plantoes", appAuthMiddleware, requireAuth, requireAdmin, upload.single("file"), async (req: express.Request, res: express.Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }

      const buffer = req.file.buffer;
      const nomeArquivo = req.file.originalname;
      const importadoPor = (req as any).appUser?.nome || "Sistema";

      const parseResult = parseXlsxDetailed(buffer);
      const { sheets: parsed, errors: parseErrors } = parseResult;

      // Se não encontrou nenhuma aba válida, retornar erro detalhado
      if (parsed.length === 0) {
        const errorDetails = parseErrors.length > 0
          ? parseErrors.map(e => `Aba "${e.aba}": ${e.motivo}${e.detalhes ? ` — ${e.detalhes}` : ""}`).join("\n")
          : "Nenhuma aba com dados válidos encontrada na planilha.";
        res.status(400).json({
          error: "Nenhum dado válido encontrado na planilha",
          detalhes: errorDetails,
          erros: parseErrors,
        });
        return;
      }

      const resultados = [];
      const todosAvisos: any[] = [];

      for (const sheet of parsed) {
        // Remover dados existentes apenas das especialidades presentes nesta planilha
        // Isso preserva outras especialidades da mesma unidade/mês/ano
        const especialidadesDaAba = Array.from(new Set(sheet.rows.map(r => r.especialidade).filter(Boolean))) as string[];
        await deleteImportacaoPlantoes(sheet.unidade, sheet.mesPagamento, sheet.anoPagamento, especialidadesDaAba);

        // Criar registro de importação
        const importacaoId = await createImportacao({
          nomeArquivo,
          unidade: sheet.unidade,
          unidadeNome: sheet.unidadeNome || sheet.unidade,
          mesReferencia: sheet.mesReferencia,
          mesPagamento: sheet.mesPagamento,
          anoPagamento: sheet.anoPagamento,
          totalRegistros: sheet.rows.length,
          importadoPor,
        });

        // Inserir plantões
        const rowsWithId = sheet.rows.map(r => ({ ...r, importacaoId, unidadeNome: sheet.unidadeNome || sheet.unidade }));
        await insertPlantoesBatch(rowsWithId);

        if (sheet.warnings && sheet.warnings.length > 0) {
          todosAvisos.push(...sheet.warnings.map(w => ({
            aba: `${sheet.unidadeNome} ${sheet.mesPagamento}/${sheet.anoPagamento}`,
            ...w,
          })));
        }

        resultados.push({
          unidade: sheet.unidade,
          unidadeNome: sheet.unidadeNome,
          mesPagamento: sheet.mesPagamento,
          anoPagamento: sheet.anoPagamento,
          totalRegistros: sheet.rows.length,
          avisos: sheet.warnings?.length || 0,
        });
      }

      res.json({
        success: true,
        resultados,
        erros: parseErrors,
        avisos: todosAvisos,
      });
    } catch (err: any) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: err.message || "Erro ao processar planilha" });
    }
  });
}
