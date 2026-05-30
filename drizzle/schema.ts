import {
  boolean,
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// =============================================================================
// ENUMs (Postgres exige enum como tipo separado)
// =============================================================================

export const perfilEnum = pgEnum("perfil", ["admin", "visualizacao"]);

// =============================================================================
// Tabela de importações de planilhas
// =============================================================================

export const importacoes = pgTable("importacoes", {
  id: serial("id").primaryKey(),
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 50 }).notNull(),
  unidadeNome: varchar("unidadeNome", { length: 100 }),
  mesReferencia: varchar("mesReferencia", { length: 20 }).notNull(), // ex: "JANEIRO"
  anoPagamento: integer("anoPagamento").notNull(),
  mesPagamento: integer("mesPagamento").notNull(),
  totalRegistros: integer("totalRegistros").default(0),
  importadoPor: varchar("importadoPor", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Importacao = typeof importacoes.$inferSelect;
export type InsertImportacao = typeof importacoes.$inferInsert;

// =============================================================================
// Tabela principal de plantões
// =============================================================================

export const plantoes = pgTable("plantoes", {
  id: serial("id").primaryKey(),
  importacaoId: integer("importacaoId").notNull(),
  unidade: varchar("unidade", { length: 50 }).notNull(),
  unidadeNome: varchar("unidadeNome", { length: 100 }),
  medico: varchar("medico", { length: 255 }).notNull(),
  razaoSocial: varchar("razaoSocial", { length: 255 }),
  especialidade: varchar("especialidade", { length: 100 }),
  tipoPlantao: varchar("tipoPlantao", { length: 100 }), // ex: "PRONTO SOCORRO", "CLÍNICA MÉDICA"
  horas: decimal("horas", { precision: 10, scale: 2 }),
  mesReferencia: varchar("mesReferencia", { length: 20 }).notNull(),
  anoPagamento: integer("anoPagamento").notNull(),
  mesPagamento: integer("mesPagamento").notNull(),
  valorBruto: decimal("valorBruto", { precision: 15, scale: 2 }).default("0"),
  valorLiquido: decimal("valorLiquido", { precision: 15, scale: 2 }).default("0"),
  solNf: date("solNf"),
  notaFiscal: varchar("notaFiscal", { length: 50 }),
  dataPagto: date("dataPagto"),
  observacao: text("observacao"),
  status: varchar("status", { length: 30 }).default("PENDENTE"), // CONCLUIDO | PENDENTE
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Plantao = typeof plantoes.$inferSelect;
export type InsertPlantao = typeof plantoes.$inferInsert;

// =============================================================================
// Tabela de usuários do sistema (autenticação própria)
// =============================================================================

export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  senhaHash: varchar("senhaHash", { length: 255 }).notNull(),
  perfil: perfilEnum("perfil").default("visualizacao").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  senhaTemporaria: boolean("senhaTemporaria").default(false).notNull(),
  tokenRecuperacao: varchar("tokenRecuperacao", { length: 128 }),
  tokenExpira: timestamp("tokenExpira"),
  ultimoLogin: timestamp("ultimoLogin"),
  criadoPor: integer("criadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = typeof appUsers.$inferInsert;
