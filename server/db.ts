import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { plantoes, importacoes, InsertPlantao, InsertImportacao } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Supabase requer SSL. `postgres` aceita o parâmetro via opções.
      _client = postgres(process.env.DATABASE_URL, {
        ssl: "require",
        max: 10,
        idle_timeout: 20,
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ---- PLANTÕES ----

export async function createImportacao(data: InsertImportacao) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db
    .insert(importacoes)
    .values(data)
    .returning({ id: importacoes.id });
  return result.id;
}

export async function deleteImportacaoPlantoes(
  unidade: string,
  mesPagamento: number,
  anoPagamento: number,
  especialidades?: string[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  if (especialidades && especialidades.length > 0) {
    // Modo seletivo: deletar apenas plantões das especialidades presentes na nova planilha
    // Isso preserva outras especialidades da mesma unidade/mês/ano
    for (const esp of especialidades) {
      // Deletar plantões dessa especialidade específica
      await db.delete(plantoes).where(
        and(
          eq(plantoes.unidade, unidade),
          eq(plantoes.mesPagamento, mesPagamento),
          eq(plantoes.anoPagamento, anoPagamento),
          eq(plantoes.especialidade, esp)
        )
      );
    }
    // Remover importações que ficaram sem plantões (limpeza)
    const existing = await db.select({ id: importacoes.id }).from(importacoes)
      .where(and(
        eq(importacoes.unidade, unidade),
        eq(importacoes.mesPagamento, mesPagamento),
        eq(importacoes.anoPagamento, anoPagamento)
      ));
    for (const imp of existing) {
      const remaining = await db.select({ id: plantoes.id }).from(plantoes)
        .where(eq(plantoes.importacaoId, imp.id)).limit(1);
      if (remaining.length === 0) {
        await db.delete(importacoes).where(eq(importacoes.id, imp.id));
      }
    }
  } else {
    // Modo completo: deletar tudo da unidade/mês/ano (comportamento original para reimportação total)
    const existing = await db.select({ id: importacoes.id }).from(importacoes)
      .where(and(
        eq(importacoes.unidade, unidade),
        eq(importacoes.mesPagamento, mesPagamento),
        eq(importacoes.anoPagamento, anoPagamento)
      ));
    for (const imp of existing) {
      await db.delete(plantoes).where(eq(plantoes.importacaoId, imp.id));
      await db.delete(importacoes).where(eq(importacoes.id, imp.id));
    }
  }
}

export async function insertPlantoesBatch(rows: InsertPlantao[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (rows.length === 0) return;
  // Insert em lotes de 100
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    await db.insert(plantoes).values(rows.slice(i, i + batchSize));
  }
}

export async function listImportacoes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importacoes).orderBy(desc(importacoes.createdAt));
}

export interface PlantaoFilter {
  unidade?: string | string[];
  mesPagamento?: number | number[];
  anoPagamento?: number | number[];
  especialidade?: string | string[];
  tipoPlantao?: string | string[];
}

// Helpers: gera condição eq ou inArray dependendo se é array ou valor único
function eqOrInStr(col: any, val: string | string[] | undefined) {
  if (!val) return null;
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    if (val.length === 1) return eq(col, val[0]);
    return inArray(col, val);
  }
  return eq(col, val);
}
function eqOrInNum(col: any, val: number | number[] | undefined) {
  if (!val) return null;
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    if (val.length === 1) return eq(col, val[0]);
    return inArray(col, val);
  }
  return eq(col, val);
}

export async function getPlantoes(filter: PlantaoFilter = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  { const _c = eqOrInStr(plantoes.unidade, filter.unidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.mesPagamento, filter.mesPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.anoPagamento, filter.anoPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.especialidade, filter.especialidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.tipoPlantao, filter.tipoPlantao); if (_c) conditions.push(_c); }
  const query = conditions.length > 0
    ? db.select().from(plantoes).where(and(...conditions))
    : db.select().from(plantoes);
  return query.orderBy(desc(plantoes.dataPagto));
}

export async function getResumoFinanceiro(filter: PlantaoFilter = {}) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [sql`${plantoes.valorBruto} > 0`];
  { const _c = eqOrInStr(plantoes.unidade, filter.unidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.mesPagamento, filter.mesPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.anoPagamento, filter.anoPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.especialidade, filter.especialidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.tipoPlantao, filter.tipoPlantao); if (_c) conditions.push(_c); }

  const [result] = await db.select({
    totalBruto: sql<number>`COALESCE(SUM(${plantoes.valorBruto}), 0)`,
    totalLiquido: sql<number>`COALESCE(SUM(${plantoes.valorLiquido}), 0)`,
    totalPago: sql<number>`COALESCE(SUM(CASE WHEN ${plantoes.dataPagto} IS NOT NULL THEN ${plantoes.valorLiquido} ELSE 0 END), 0)`,
    totalEmAberto: sql<number>`COALESCE(SUM(CASE WHEN ${plantoes.dataPagto} IS NULL THEN ${plantoes.valorLiquido} ELSE 0 END), 0)`,
    totalMedicos: sql<number>`COUNT(DISTINCT ${plantoes.medico})`,
    totalPlantoes: sql<number>`COALESCE(SUM(${plantoes.horas}), 0) / 12`,
  }).from(plantoes).where(and(...conditions));
  return result;
}

export async function getResumoByUnidade(filter: PlantaoFilter = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [sql`${plantoes.valorBruto} > 0`];
  { const _c = eqOrInNum(plantoes.mesPagamento, filter.mesPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.anoPagamento, filter.anoPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.especialidade, filter.especialidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.tipoPlantao, filter.tipoPlantao); if (_c) conditions.push(_c); }

  return db.select({
    unidade: plantoes.unidade,
    totalBruto: sql<number>`COALESCE(SUM(${plantoes.valorBruto}), 0)`,
    totalLiquido: sql<number>`COALESCE(SUM(${plantoes.valorLiquido}), 0)`,
    totalPago: sql<number>`COALESCE(SUM(CASE WHEN ${plantoes.dataPagto} IS NOT NULL THEN ${plantoes.valorLiquido} ELSE 0 END), 0)`,
    totalEmAberto: sql<number>`COALESCE(SUM(CASE WHEN ${plantoes.dataPagto} IS NULL THEN ${plantoes.valorLiquido} ELSE 0 END), 0)`,
    totalMedicos: sql<number>`COUNT(DISTINCT ${plantoes.medico})`,
    totalPlantoes: sql<number>`COALESCE(SUM(${plantoes.horas}), 0) / 12`,
  }).from(plantoes).where(and(...conditions)).groupBy(plantoes.unidade);
}

export async function getResumoByEspecialidade(filter: PlantaoFilter = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [sql`${plantoes.valorBruto} > 0`];
  { const _c = eqOrInStr(plantoes.unidade, filter.unidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.mesPagamento, filter.mesPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.anoPagamento, filter.anoPagamento); if (_c) conditions.push(_c); }

  return db.select({
    especialidade: plantoes.especialidade,
    tipoPlantao: plantoes.tipoPlantao,
    totalBruto: sql<number>`COALESCE(SUM(${plantoes.valorBruto}), 0)`,
    totalLiquido: sql<number>`COALESCE(SUM(${plantoes.valorLiquido}), 0)`,
    totalPago: sql<number>`COALESCE(SUM(CASE WHEN ${plantoes.dataPagto} IS NOT NULL THEN ${plantoes.valorLiquido} ELSE 0 END), 0)`,
    totalEmAberto: sql<number>`COALESCE(SUM(CASE WHEN ${plantoes.dataPagto} IS NULL THEN ${plantoes.valorLiquido} ELSE 0 END), 0)`,
    totalMedicos: sql<number>`COUNT(DISTINCT ${plantoes.medico})`,
    totalPlantoes: sql<number>`COALESCE(SUM(${plantoes.horas}), 0) / 12`,
  }).from(plantoes).where(and(...conditions)).groupBy(plantoes.especialidade, plantoes.tipoPlantao);
}

export async function getResumoByMes(filter: PlantaoFilter = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [sql`${plantoes.valorBruto} > 0`];
  { const _c = eqOrInStr(plantoes.unidade, filter.unidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.especialidade, filter.especialidade); if (_c) conditions.push(_c); }

  return db.select({
    mesPagamento: plantoes.mesPagamento,
    anoPagamento: plantoes.anoPagamento,
    totalBruto: sql<number>`COALESCE(SUM(${plantoes.valorBruto}), 0)`,
    totalLiquido: sql<number>`COALESCE(SUM(${plantoes.valorLiquido}), 0)`,
    totalPago: sql<number>`COALESCE(SUM(CASE WHEN ${plantoes.dataPagto} IS NOT NULL THEN ${plantoes.valorLiquido} ELSE 0 END), 0)`,
    totalEmAberto: sql<number>`COALESCE(SUM(CASE WHEN ${plantoes.dataPagto} IS NULL THEN ${plantoes.valorLiquido} ELSE 0 END), 0)`,
  }).from(plantoes).where(and(...conditions)).groupBy(plantoes.mesPagamento, plantoes.anoPagamento)
    .orderBy(plantoes.anoPagamento, plantoes.mesPagamento);
}

export async function getTopMedicos(filter: PlantaoFilter = {}, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [sql`${plantoes.valorBruto} > 0`];
  { const _c = eqOrInStr(plantoes.unidade, filter.unidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.mesPagamento, filter.mesPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.anoPagamento, filter.anoPagamento); if (_c) conditions.push(_c); }

  return db.select({
    medico: plantoes.medico,
    razaoSocial: plantoes.razaoSocial,
    totalBruto: sql<number>`COALESCE(SUM(${plantoes.valorBruto}), 0)`,
    totalLiquido: sql<number>`COALESCE(SUM(${plantoes.valorLiquido}), 0)`,
  }).from(plantoes).where(and(...conditions)).groupBy(plantoes.medico, plantoes.razaoSocial)
    .orderBy(sql`SUM(${plantoes.valorBruto}) DESC`).limit(limit);
}

export async function getDistinctUnidades() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ unidade: plantoes.unidade }).from(plantoes).orderBy(plantoes.unidade);
  return result.map(r => r.unidade);
}

export async function getDistinctEspecialidades(unidade?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = unidade
    ? db.selectDistinct({ especialidade: plantoes.especialidade }).from(plantoes).where(eq(plantoes.unidade, unidade))
    : db.selectDistinct({ especialidade: plantoes.especialidade }).from(plantoes);
  const result = await query.orderBy(plantoes.especialidade);
  return result.map(r => r.especialidade).filter(Boolean);
}

export async function getDistinctTiposPlantao(unidade?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = unidade
    ? db.selectDistinct({ tipoPlantao: plantoes.tipoPlantao }).from(plantoes).where(eq(plantoes.unidade, unidade))
    : db.selectDistinct({ tipoPlantao: plantoes.tipoPlantao }).from(plantoes);
  const result = await query.orderBy(plantoes.tipoPlantao);
  return result.map(r => r.tipoPlantao).filter(Boolean);
}

export async function getDistinctPeriodos() {
  const db = await getDb();
  if (!db) return [];
  return db.selectDistinct({ mesPagamento: plantoes.mesPagamento, anoPagamento: plantoes.anoPagamento })
    .from(plantoes).orderBy(desc(plantoes.anoPagamento), desc(plantoes.mesPagamento));
}

export interface PontualidadeUnidade {
  unidade: string;
  totalPagos: number;
  pagosNoPrazo: number;
  pagosEmAtraso: number;
  emAberto: number;
  indicePontualidade: number; // % de pagos no prazo sobre total pago
  mediaDiasAtraso: number;   // média de dias de atraso (só dos atrasados)
}

export async function getPontualidadePorUnidade(filter: PlantaoFilter = {}): Promise<PontualidadeUnidade[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [sql`${plantoes.valorBruto} > 0`];
  { const _c = eqOrInNum(plantoes.mesPagamento, filter.mesPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInNum(plantoes.anoPagamento, filter.anoPagamento); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.especialidade, filter.especialidade); if (_c) conditions.push(_c); }
  { const _c = eqOrInStr(plantoes.tipoPlantao, filter.tipoPlantao); if (_c) conditions.push(_c); }

  // Buscar todos os plantões com data de pagamento para calcular pontualidade
  const rows = await db.select({
    unidade: plantoes.unidade,
    unidadeNome: plantoes.unidadeNome,
    mesPagamento: plantoes.mesPagamento,
    anoPagamento: plantoes.anoPagamento,
    dataPagto: plantoes.dataPagto,
    solNf: plantoes.solNf,
  }).from(plantoes).where(and(...conditions));

  // Importar a função de cálculo de vencimento
  const { calcularDiasAtraso } = await import("./vencimento");

  // Agrupar por unidade
  const byUnidade = new Map<string, {
    totalPagos: number;
    pagosNoPrazo: number;
    pagosEmAtraso: number;
    emAberto: number;
    somaDiasAtraso: number;
    countAtrasados: number;
  }>();

  for (const row of rows) {
    if (!byUnidade.has(row.unidade)) {
      byUnidade.set(row.unidade, {
        totalPagos: 0, pagosNoPrazo: 0, pagosEmAtraso: 0,
        emAberto: 0, somaDiasAtraso: 0, countAtrasados: 0,
      });
    }
    const acc = byUnidade.get(row.unidade)!;

    if (row.dataPagto) {
      acc.totalPagos++;
      const { diasAtraso } = calcularDiasAtraso(
        row.unidade, row.mesPagamento, row.anoPagamento,
        new Date(row.dataPagto)
      );
      if (diasAtraso === null || diasAtraso === 0) {
        acc.pagosNoPrazo++;
      } else {
        acc.pagosEmAtraso++;
        acc.somaDiasAtraso += diasAtraso;
        acc.countAtrasados++;
      }
    } else {
      acc.emAberto++;
    }
  }

  const result: PontualidadeUnidade[] = [];
  for (const [unidade, acc] of Array.from(byUnidade.entries())) {
    const total = acc.totalPagos + acc.emAberto;
    result.push({
      unidade,
      totalPagos: acc.totalPagos,
      pagosNoPrazo: acc.pagosNoPrazo,
      pagosEmAtraso: acc.pagosEmAtraso,
      emAberto: acc.emAberto,
      indicePontualidade: acc.totalPagos > 0
        ? Math.round((acc.pagosNoPrazo / acc.totalPagos) * 100)
        : 0,
      mediaDiasAtraso: acc.countAtrasados > 0
        ? Math.round(acc.somaDiasAtraso / acc.countAtrasados)
        : 0,
    });
  }

  // Ordenar por pior índice de pontualidade primeiro
  return result.sort((a, b) => a.indicePontualidade - b.indicePontualidade);
}
