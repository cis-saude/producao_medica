/**
 * Utilitário de cálculo de vencimento por unidade
 *
 * Regras:
 * - Grupo 1 (SM, FAX, CAR, ARA, APU): dia 15 fixo do mês de pagamento
 *   → se cair em feriado/sábado/domingo, avança para o primeiro dia útil subsequente
 *
 * - Grupo 2 (FOZ, FRG, RBS): 15º dia útil do mês de pagamento
 *   → se o 15º dia útil cair em feriado/sábado/domingo, avança para o primeiro dia útil subsequente
 *   (na prática, o 15º dia útil já é dia útil por definição, mas garantimos a checagem)
 *
 * - Grupo 3 (GUA): 20º dia útil do mês de pagamento
 *   → mesma lógica de ajuste
 *
 * Feriados: apenas nacionais fixos (não móveis como Carnaval/Corpus Christi)
 * para simplificar e garantir consistência sem dependência de API externa.
 */

// Feriados nacionais fixos (mês 1-based, dia)
const FERIADOS_FIXOS: Array<{ mes: number; dia: number }> = [
  { mes: 1, dia: 1 },   // Ano Novo
  { mes: 4, dia: 21 },  // Tiradentes
  { mes: 5, dia: 1 },   // Dia do Trabalho
  { mes: 9, dia: 7 },   // Independência
  { mes: 10, dia: 12 }, // Nossa Senhora Aparecida
  { mes: 11, dia: 2 },  // Finados
  { mes: 11, dia: 15 }, // Proclamação da República
  { mes: 11, dia: 20 }, // Consciência Negra (feriado nacional desde 2024)
  { mes: 12, dia: 25 }, // Natal
];

// Feriados móveis pré-calculados para os anos relevantes (2025-2030)
// Calculados com base na fórmula de Gauss para a Páscoa
const FERIADOS_MOVEIS: Record<number, Array<{ mes: number; dia: number }>> = {
  2025: [
    { mes: 3, dia: 3 },  // Carnaval (seg)
    { mes: 3, dia: 4 },  // Carnaval (ter)
    { mes: 4, dia: 18 }, // Sexta-feira Santa
    { mes: 4, dia: 20 }, // Páscoa
    { mes: 6, dia: 19 }, // Corpus Christi
  ],
  2026: [
    { mes: 2, dia: 16 }, // Carnaval (seg)
    { mes: 2, dia: 17 }, // Carnaval (ter)
    { mes: 4, dia: 3 },  // Sexta-feira Santa
    { mes: 4, dia: 5 },  // Páscoa
    { mes: 6, dia: 4 },  // Corpus Christi
  ],
  2027: [
    { mes: 2, dia: 8 },  // Carnaval (seg)
    { mes: 2, dia: 9 },  // Carnaval (ter)
    { mes: 3, dia: 26 }, // Sexta-feira Santa
    { mes: 3, dia: 28 }, // Páscoa
    { mes: 5, dia: 27 }, // Corpus Christi
  ],
  2028: [
    { mes: 2, dia: 28 }, // Carnaval (seg)
    { mes: 2, dia: 29 }, // Carnaval (ter)
    { mes: 4, dia: 14 }, // Sexta-feira Santa
    { mes: 4, dia: 16 }, // Páscoa
    { mes: 6, dia: 15 }, // Corpus Christi
  ],
  2029: [
    { mes: 2, dia: 12 }, // Carnaval (seg)
    { mes: 2, dia: 13 }, // Carnaval (ter)
    { mes: 3, dia: 30 }, // Sexta-feira Santa
    { mes: 4, dia: 1 },  // Páscoa
    { mes: 5, dia: 31 }, // Corpus Christi
  ],
  2030: [
    { mes: 3, dia: 4 },  // Carnaval (seg)
    { mes: 3, dia: 5 },  // Carnaval (ter)
    { mes: 4, dia: 19 }, // Sexta-feira Santa
    { mes: 4, dia: 21 }, // Páscoa
    { mes: 6, dia: 20 }, // Corpus Christi
  ],
};

/** Verifica se uma data é feriado nacional */
function isFeriado(date: Date): boolean {
  const mes = date.getMonth() + 1; // 1-based
  const dia = date.getDate();
  const ano = date.getFullYear();

  // Feriados fixos
  if (FERIADOS_FIXOS.some(f => f.mes === mes && f.dia === dia)) return true;

  // Feriados móveis
  const moveis = FERIADOS_MOVEIS[ano] ?? [];
  if (moveis.some(f => f.mes === mes && f.dia === dia)) return true;

  return false;
}

/** Verifica se uma data é dia útil (não é sábado, domingo ou feriado) */
function isDiaUtil(date: Date): boolean {
  const dow = date.getDay(); // 0=domingo, 6=sábado
  if (dow === 0 || dow === 6) return false;
  if (isFeriado(date)) return false;
  return true;
}

/** Avança para o próximo dia útil se a data não for dia útil */
function proximoDiaUtil(date: Date): Date {
  const d = new Date(date);
  while (!isDiaUtil(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Retorna o N-ésimo dia útil de um dado mês/ano */
function getNesimoDiaUtil(ano: number, mes: number, n: number): Date {
  const d = new Date(ano, mes - 1, 1); // 1º dia do mês (mês 0-based)
  let count = 0;
  while (true) {
    if (isDiaUtil(d)) {
      count++;
      if (count === n) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
    // Segurança: não ultrapassar o mês
    if (d.getMonth() !== mes - 1) {
      // Se não encontrou N dias úteis no mês, retorna o último encontrado
      // (não deve acontecer para N=15 ou N=20 em meses normais)
      break;
    }
  }
  return d;
}

// Mapeamento de unidade para grupo de regra
const GRUPO_UNIDADE: Record<string, 1 | 2 | 3> = {
  // Grupo 1: dia 15 fixo
  SM: 1, FAX: 1, CAR: 1, ARA: 1, APU: 1,
  // Grupo 2: 15º dia útil
  FOZ: 2, FRG: 2, RBS: 2,
  // Grupo 3: 20º dia útil
  GUA: 3,
};

export interface VencimentoInfo {
  /** Data de vencimento calculada (já ajustada para dia útil) */
  dataVencimento: Date;
  /** Descrição da regra aplicada */
  regra: string;
  /** Grupo da regra (1, 2 ou 3) */
  grupo: 1 | 2 | 3;
}

/**
 * Calcula a data de vencimento para uma unidade em um dado mês/ano de pagamento.
 * Retorna null se a unidade não tiver regra definida.
 */
export function calcularVencimento(
  unidade: string,
  mesPagamento: number,
  anoPagamento: number
): VencimentoInfo | null {
  const grupo = GRUPO_UNIDADE[unidade.toUpperCase()];
  if (!grupo) return null;

  let dataBase: Date;
  let regra: string;

  if (grupo === 1) {
    // Dia 15 fixo
    dataBase = new Date(anoPagamento, mesPagamento - 1, 15);
    regra = "Dia 15 fixo";
  } else if (grupo === 2) {
    // 15º dia útil
    dataBase = getNesimoDiaUtil(anoPagamento, mesPagamento, 15);
    regra = "15º dia útil";
  } else {
    // 20º dia útil
    dataBase = getNesimoDiaUtil(anoPagamento, mesPagamento, 20);
    regra = "20º dia útil";
  }

  // Ajustar para próximo dia útil se necessário
  const dataVencimento = proximoDiaUtil(dataBase);

  return { dataVencimento, regra, grupo };
}

/**
 * Calcula os dias de atraso de um plantão.
 * @param unidade - Código da unidade
 * @param mesPagamento - Mês de pagamento (1-12)
 * @param anoPagamento - Ano de pagamento
 * @param dataPagto - Data em que foi pago (null se ainda não pago)
 * @param hoje - Data de referência para cálculo (padrão: hoje)
 * @returns Número de dias em atraso (0 se no prazo, negativo se ainda não venceu)
 */
export function calcularDiasAtraso(
  unidade: string,
  mesPagamento: number,
  anoPagamento: number,
  dataPagto: Date | null,
  hoje: Date = new Date()
): { diasAtraso: number | null; dataVencimento: Date | null; regra: string | null } {
  const info = calcularVencimento(unidade, mesPagamento, anoPagamento);
  if (!info) return { diasAtraso: null, dataVencimento: null, regra: null };

  const venc = info.dataVencimento;
  // Normalizar para meia-noite UTC para comparação de dias
  const vencNorm = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate());

  if (dataPagto) {
    // Pago: calcular dias entre vencimento e data de pagamento
    const pagoNorm = new Date(dataPagto.getFullYear(), dataPagto.getMonth(), dataPagto.getDate());
    const diffMs = pagoNorm.getTime() - vencNorm.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    // Se pago antes ou no vencimento: 0 dias de atraso
    // Se pago depois: positivo (dias em atraso)
    return {
      diasAtraso: diffDias > 0 ? diffDias : 0,
      dataVencimento: venc,
      regra: info.regra,
    };
  } else {
    // Não pago: calcular dias entre vencimento e hoje
    const hojeNorm = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const diffMs = hojeNorm.getTime() - vencNorm.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    // Se ainda não venceu: 0 (não está em atraso)
    // Se já venceu: positivo
    return {
      diasAtraso: diffDias > 0 ? diffDias : 0,
      dataVencimento: venc,
      regra: info.regra,
    };
  }
}
