import * as XLSX from "xlsx";
import { InsertPlantao } from "../drizzle/schema";

const MESES: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

/**
 * Mapeamento opcional de nomes de cidades para códigos amigáveis.
 * Se a unidade não for encontrada aqui, o parser usa o nome da célula diretamente.
 * Isso garante que qualquer nova planilha seja aceita sem alteração de código.
 */
const UNIDADE_MAP: { pattern: RegExp; code: string; nome: string }[] = [
  { pattern: /ARAPOTI/,            code: "ARA", nome: "ARAPOTI" },
  { pattern: /FAZENDA RIO GRANDE/, code: "FRG", nome: "FAZENDA RIO GRANDE" },
  { pattern: /SANTA MARIANA/,      code: "SM",  nome: "SANTA MARIANA" },
  { pattern: /CARLOPOLIS/,         code: "CAR", nome: "CARLÓPOLIS" },
  { pattern: /FAXINAL/,            code: "FAX", nome: "FAXINAL" },
  { pattern: /RIO BRANCO DO SUL/,  code: "RBS", nome: "RIO BRANCO DO SUL" },
  // Novas unidades são detectadas automaticamente — não é necessário adicionar aqui.
];

/** Remove acentos, converte para maiúsculas e trim */
function norm(val: unknown): string {
  if (!val) return "";
  return String(val).trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseMoneyValue(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/R\$\s*/g, "").replace(/\s/g, "").trim();
  if (!str || str === "-" || str === "") return 0;
  const cleaned = str.replace(/[^\d.,\-]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) {
    // Brazilian format: 16.250,00
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // US format: 16,250.00
    normalized = cleaned.replace(/,/g, "");
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

/**
 * Converte valor de célula de data para Date sem ajuste de timezone.
 * O Excel armazena datas como número serial. Ao usar cellDates:true, o xlsx
 * converte para Date UTC. Para evitar o -1 dia por fuso, extraímos o
 * número serial diretamente e usamos Date local.
 */
/**
 * Formata uma Date como YYYY-MM-DD usando componentes LOCAIS
 * (evita o off-by-one de toISOString() em timezones com offset negativo).
 */
function formatDateOnly(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Faz parse de uma célula de data do Excel e retorna no formato YYYY-MM-DD.
 * Postgres `date` aceita string ISO de data nesse formato.
 */
function parseDateCell(val: unknown): string | null {
  if (val === null || val === undefined) return null;

  // Se já é um objeto Date (cellDates:true), extrair ano/mês/dia do UTC
  // para evitar conversão de fuso horário
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return formatDateOnly(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate());
  }

  const str = String(val).trim();
  if (!str || str === "null" || str === "") return null;

  // Número serial do Excel (ex: 45983)
  if (/^\d+$/.test(str)) {
    const serial = parseInt(str);
    if (serial > 1000 && serial < 100000) {
      const d = XLSX.SSF.parse_date_code(serial);
      if (d) return formatDateOnly(d.y, d.m - 1, d.d);
    }
    return null;
  }

  // M/D/YY or M/D/YYYY (US Excel format)
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdyMatch) {
    let year = parseInt(mdyMatch[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    const month = parseInt(mdyMatch[1]) - 1;
    const day = parseInt(mdyMatch[2]);
    return formatDateOnly(year, month, day);
  }

  // DD/MM/YYYY (Brazilian format)
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const month = parseInt(dmyMatch[2]) - 1;
    const year = parseInt(dmyMatch[3]);
    return formatDateOnly(year, month, day);
  }

  // ISO string: 2026-03-17T... — extrair apenas a parte da data
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    return formatDateOnly(year, month, day);
  }

  return null;
}

/**
 * Detecta unidade a partir de uma string de célula.
 * Se não encontrar no mapa, retorna um código gerado automaticamente a partir do nome.
 * Isso garante que qualquer nova unidade seja aceita sem precisar alterar o código.
 */
function detectUnidade(cellStr: string): { code: string; nome: string } | null {
  if (!cellStr || !cellStr.trim()) return null;
  const upper = cellStr.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Verificar no mapa de unidades conhecidas
  for (const u of UNIDADE_MAP) {
    const patternNorm = u.pattern.source.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (new RegExp(patternNorm).test(upper)) return { code: u.code, nome: u.nome };
  }
  
  // Unidade não mapeada: gerar código automático a partir do nome
  // Ex: "RIO BRANCO DO SUL" → "RBS", "NOVA CIDADE" → "NOV"
  const words = upper.split(/\s+/).filter(w => w.length > 2 && !['DO', 'DA', 'DE', 'DOS', 'DAS'].includes(w));
  const autoCode = words.length >= 2
    ? words.slice(0, 3).map(w => w[0]).join("")
    : upper.substring(0, 3);
  
  return { code: autoCode, nome: cellStr.trim().toUpperCase() };
}

export interface ParseWarning {
  linha: number;
  campo: string;
  valorOriginal: string;
  mensagem: string;
}

export interface ParsedSheet {
  unidade: string;
  unidadeNome: string;
  mesPagamento: number;
  anoPagamento: number;
  mesReferencia: string;
  rows: Omit<InsertPlantao, "importacaoId">[];
  warnings: ParseWarning[];
}

export interface ParseError {
  aba: string;
  motivo: string;
  detalhes?: string;
}

export interface ParseResult {
  sheets: ParsedSheet[];
  errors: ParseError[];
}

export function parseXlsx(buffer: Buffer): ParsedSheet[] {
  return parseXlsxDetailed(buffer).sheets;
}

export function parseXlsxDetailed(buffer: Buffer): ParseResult {
  // Usar cellDates:true para receber objetos Date diretamente
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const results: ParsedSheet[] = [];
  const globalErrors: ParseError[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const raw = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as unknown[][];

    // Verificar se a aba tem conteúdo mínimo
    const nonEmptyRows = raw.filter(r => r && (r as any[]).some((c: any) => c !== null && c !== ""));
    if (nonEmptyRows.length < 3) {
      globalErrors.push({ aba: sheetName, motivo: "Aba vazia ou com menos de 3 linhas com conteúdo" });
      continue;
    }

    let unidade = "";
    let unidadeNome = "";
    let mesPagamento = 0;
    let anoPagamento = 0;
    let mesReferencia = "";
    const sheetWarnings: ParseWarning[] = [];

    // Scan first rows for metadata (up to row 15)
    for (let i = 0; i < Math.min(15, raw.length); i++) {
      const row = raw[i] as unknown[];
      for (const cell of row) {
        // Tratar datas que podem aparecer nas células de metadados
        if (cell instanceof Date) continue;
        if (typeof cell !== "string") continue;
        const upper = cell.toUpperCase().trim();
        const upperNorm = upper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Detect unidade from city name
        // Ignorar títulos genéricos da planilha e células de metadados
        const isGenericTitle = upperNorm.includes("PLANTONISTA") || upperNorm.includes("RELATORIO") ||
          upperNorm.includes("ESCALA") || upperNorm.includes("PLANTAO") || upperNorm.includes("MEDICO") ||
          upperNorm.includes("PAGAMENTO") || upperNorm.includes("REFERENCIA") ||
          upperNorm.includes("VALOR") || upperNorm.includes("TOTAL") || upperNorm.includes("LIQUIDO");
        
        if (!isGenericTitle && upper.length >= 3 && upper.length <= 50) {
          // Verificar primeiro no mapa de unidades conhecidas (mais confiável)
          let foundKnown = false;
          for (const u of UNIDADE_MAP) {
            const patternNorm = u.pattern.source.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (new RegExp(patternNorm).test(upperNorm)) {
              if (!unidade) { unidade = u.code; unidadeNome = u.nome; }
              foundKnown = true;
              break;
            }
          }
          // Se não achou no mapa mas parece nome de cidade (sem números, sem símbolos especiais)
          // Guardar como candidato mas não definir ainda (esperar achar no mapa de dados)
          if (!foundKnown && !unidade && /^[A-ZÀ-ÿ\s]+$/.test(upper) && upper.split(" ").length >= 1) {
            // Será usado apenas se nenhuma outra detecção funcionar
            // (guardado na variável tempUnidade abaixo)
          }
        }

        // PAGAMENTO: JANEIRO/2026
        const pagMatch = upperNorm.match(/PAGAMENTO[:\s]+([A-Z]+)[\/\s]+(\d{4})/);
        if (pagMatch) {
          const mesNome = pagMatch[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          mesPagamento = MESES[mesNome] || 0;
          anoPagamento = parseInt(pagMatch[2]);
        }

        // REFERÊNCIA: DEZEMBRO/2025
        const refMatch = upperNorm.match(/REFER[EÊ]NCIA[:\s]+([A-Z]+)[\/\s]+(\d{4})/);
        if (refMatch) {
          mesReferencia = refMatch[1];
        }
      }
    }

    // Se unidade não encontrada nas linhas de metadados, tentar detectar nas linhas de dados
    if (!unidade) {
      for (let i = 5; i < Math.min(25, raw.length); i++) {
        const row = raw[i] as unknown[];
        const firstCell = norm(row[0]);
        // Coluna 0 pode ser o código da unidade (ex: "RBS", "ARA") ou nome completo
        if (firstCell && firstCell.length >= 2 && firstCell.length <= 30) {
          // Tentar pelo mapa primeiro
          for (const u of UNIDADE_MAP) {
            if (firstCell === u.code) {
              unidade = u.code;
              unidadeNome = u.nome;
              break;
            }
          }
          // Se não achou no mapa mas parece um código curto (2-5 chars), usar como código
          if (!unidade && firstCell.length >= 2 && firstCell.length <= 5 && /^[A-Z]+$/.test(firstCell)) {
            // Verificar se a linha tem dados de médico (col 1 deve ter nome)
            const secondCell = norm(row[1]);
            if (secondCell && secondCell.length > 3 && !/^\d/.test(secondCell)) {
              unidade = firstCell;
              unidadeNome = firstCell; // Será atualizado se encontrarmos o nome completo
              break;
            }
          }
          if (unidade) break;
        }
      }
    }

    // Se ainda não encontrou unidade, tentar extrair de qualquer texto nas primeiras linhas
    if (!unidade) {
      for (let i = 0; i < Math.min(8, raw.length); i++) {
        const row = raw[i] as unknown[];
        for (const cell of row) {
          if (typeof cell !== "string" || cell.length < 3) continue;
          const cellNorm = norm(cell);
          // Ignorar células que são claramente não-unidades
          if (cellNorm.includes("PAGAMENTO") || cellNorm.includes("VALOR") || 
              cellNorm.includes("TOTAL") || cellNorm.includes("MEDICO") ||
              cellNorm.includes("PLANTONISTA") || cellNorm.includes("RELATORIO")) continue;
          // Tentar detectar como unidade
          const found = detectUnidade(cell);
          if (found && found.code.length >= 2) {
            unidade = found.code;
            unidadeNome = found.nome;
            break;
          }
        }
        if (unidade) break;
      }
    }

    // Último recurso: usar o nome da aba como unidade
    if (!unidade && sheetName) {
      // Extrair informação de unidade do nome da aba (ex: "PAGTOS 01-2026" → sem info)
      // Usar o nome do arquivo como fallback
      const sheetNorm = norm(sheetName);
      if (!sheetNorm.includes("PAGTO") && !sheetNorm.includes("PLAN") && sheetNorm.length > 2) {
        unidade = sheetNorm.substring(0, 5);
        unidadeNome = sheetName.toUpperCase();
      }
    }

    // Se mesmo assim não encontrou, registrar aviso mas continuar tentando processar
    if (!unidade) {
      const allText = raw.slice(0, 8).flat().filter(c => typeof c === "string").join(" ").toUpperCase();
      globalErrors.push({
        aba: sheetName,
        motivo: "Não foi possível identificar a unidade automaticamente",
        detalhes: `Verifique se a planilha contém o nome da cidade/unidade nas primeiras linhas. Texto encontrado: "${allText.substring(0, 200)}".`,
      });
      continue;
    }

    if (!mesPagamento || !anoPagamento) {
      globalErrors.push({
        aba: sheetName,
        motivo: "Mês/ano de pagamento não encontrado",
        detalhes: `Unidade detectada: ${unidadeNome}. Verifique se a planilha contém uma célula no formato "PAGAMENTO: MÊS/ANO" (ex: PAGAMENTO: JANEIRO/2026).`,
      });
      continue;
    }

    const parsedRows: Omit<InsertPlantao, "importacaoId">[] = [];
    let headerRowIndex = -1;
    let colMap: Record<string, number> = {};

    for (let i = 0; i < raw.length; i++) {
      const row = raw[i] as unknown[];
      const rowNorm = row.map(c => (c instanceof Date) ? "" : norm(c));
      const rowStr = rowNorm.join("|");

      // Detect column header row: must have UNIDADE and MEDICO
      const hasUnidade = rowStr.includes("UNIDADE");
      const hasMedico = rowStr.includes("MEDICO");

      if (hasUnidade && hasMedico) {
        colMap = {};
        rowNorm.forEach((key, idx) => {
          if (key === "UNIDADE") colMap["unidade"] = idx;
          else if (key === "MEDICO" || key.startsWith("MEDICO")) colMap["medico"] = idx;
          else if (key.includes("RAZAO") || key.includes("SOCIAL")) colMap["razaoSocial"] = idx;
          else if (key.includes("ESPECIALIDADE")) colMap["especialidade"] = idx;
          else if (key === "HORAS") colMap["horas"] = idx;
          else if (key.includes("MES") && (key.includes("REF") || key.includes("RFER"))) colMap["mesRef"] = idx;
          else if (key.includes("MES") && !key.includes("REF") && !key.includes("RFER") && !colMap["mesRef"]) colMap["mesRef"] = idx;
          else if (key.includes("BRUTO")) colMap["valorBruto"] = idx;
          else if (key.includes("LIQUIDO")) colMap["valorLiquido"] = idx;
          else if (key.includes("SOL") && key.includes("NF")) colMap["solNf"] = idx;
          else if (key.includes("NOTA")) colMap["notaFiscal"] = idx;
          else if ((key.includes("DATA") || key.includes("PAGTO") || key.includes("DT")) && !colMap["dataPagto"]) {
            colMap["dataPagto"] = idx;
          }
          else if (key.includes("OBS")) colMap["observacao"] = idx;
          else if (key.includes("VENCIMENTO") || key.includes("VENC")) colMap["vencimento"] = idx;
          else if (key === "STATUS") colMap["status"] = idx;
        });
        headerRowIndex = i;

        // Verificar colunas obrigatórias
        const missingCols: string[] = [];
        if (colMap["medico"] === undefined) missingCols.push("MÉDICO");
        if (colMap["valorBruto"] === undefined) missingCols.push("VALOR BRUTO");
        if (colMap["valorLiquido"] === undefined) missingCols.push("VALOR LÍQUIDO");
        if (missingCols.length > 0) {
          sheetWarnings.push({
            linha: i + 1,
            campo: "cabeçalho",
            valorOriginal: rowStr.replace(/\|/g, ", "),
            mensagem: `Colunas obrigatórias não encontradas: ${missingCols.join(", ")}`,
          });
        }
        continue;
      }

      // Process data rows
      if (headerRowIndex >= 0 && Object.keys(colMap).length > 3) {
        const getCell = (key: string) => colMap[key] !== undefined ? row[colMap[key]] : null;
        const getCellNorm = (key: string) => {
          const v = getCell(key);
          return (v instanceof Date) ? "" : norm(v);
        };

        const medico = getCellNorm("medico");
        // Skip empty, total or header rows
        if (!medico) continue;
        // Ignorar linhas de subtotal/total: TOTAL, TOTAL:, TOTAL GERAL, SUBTOTAL, etc.
        if (
          medico === "TOTAL" ||
          medico === "TOTAL:" ||
          medico.startsWith("TOTAL ") ||
          medico.startsWith("TOTAL:") ||
          medico === "SUBTOTAL" ||
          medico === "SUBTOTAL:" ||
          medico.startsWith("SUBTOTAL ") ||
          medico === "MEDICO" ||
          medico === "UNIDADE"
        ) continue;
        // Skip rows where medico is a money value or number
        if (medico.startsWith("R$") || /^\d/.test(medico)) continue;;

        const valorBruto = parseMoneyValue(getCell("valorBruto"));
        const valorLiquido = parseMoneyValue(getCell("valorLiquido"));

        // Validar valores: líquido não deve ser maior que bruto (exceto quando ambos são 0)
        if (valorBruto > 0 && valorLiquido > valorBruto * 1.05) {
          sheetWarnings.push({
            linha: i + 1,
            campo: "VALOR LÍQUIDO",
            valorOriginal: String(getCell("valorLiquido")),
            mensagem: `Valor líquido (${valorLiquido}) maior que bruto (${valorBruto}) para médico "${medico}"`,
          });
        }

        const espCell = getCellNorm("especialidade");
        let tipoPlantao = "";
        if (espCell.includes("OBSTETRIC")) tipoPlantao = "OBSTETRÍCIA";
        else if (espCell.includes("DIRECAO") || espCell.includes("DIRETOR")) tipoPlantao = "DIRECAO CLINICA";
        else if (espCell) tipoPlantao = espCell;
        else tipoPlantao = unidade === "FRG" ? "OBSTETRÍCIA" : "CLINICA MEDICA";

        const especialidade = espCell || tipoPlantao;
        const mesRefCell = getCellNorm("mesRef");
        const rowUnidade = getCellNorm("unidade") || unidade;

        // Processar data de pagamento sem ajuste de fuso
        const dataPagtoRaw = getCell("dataPagto");
        const dataPagto = parseDateCell(dataPagtoRaw);

        // Processar solicitação de NF
        const solNfRaw = getCell("solNf");
        const solNf = parseDateCell(solNfRaw);

        const rowData: Omit<InsertPlantao, "importacaoId"> = {
          unidade: rowUnidade,
          unidadeNome: unidadeNome,
          medico,
          razaoSocial: getCellNorm("razaoSocial") || null,
          especialidade: especialidade || null,
          tipoPlantao: tipoPlantao || null,
          horas: parseMoneyValue(getCell("horas")).toString() as any,
          mesReferencia: mesRefCell || mesReferencia,
          anoPagamento,
          mesPagamento,
          valorBruto: valorBruto.toFixed(2) as any,
          valorLiquido: valorLiquido.toFixed(2) as any,
          solNf,
          notaFiscal: getCell("notaFiscal") ? String(getCell("notaFiscal")).trim() : null,
          dataPagto,
          observacao: getCell("observacao") ? String(getCell("observacao")).trim() : null,
          status: (() => {
            const s = getCellNorm("status");
            if (!s) return null;
            if (s.includes("CONCLUI") || s.includes("PAGO") || s.includes("REALIZ")) return "CONCLUIDO";
            if (s.includes("PEND")) return "PENDENTE";
            return null; // valor desconhecido: não assumir status
          })(),
        };

        parsedRows.push(rowData);
      }
    }

    if (parsedRows.length === 0 && headerRowIndex >= 0) {
      globalErrors.push({
        aba: sheetName,
        motivo: "Nenhum registro de dados encontrado após o cabeçalho",
        detalhes: `Unidade: ${unidadeNome}, Pagamento: ${mesPagamento}/${anoPagamento}. Cabeçalho encontrado na linha ${headerRowIndex + 1}, mas nenhuma linha de dados válida foi processada.`,
      });
      continue;
    }

    if (parsedRows.length > 0) {
      results.push({ unidade, unidadeNome, mesPagamento, anoPagamento, mesReferencia, rows: parsedRows, warnings: sheetWarnings });
    }
  }

  return { sheets: results, errors: globalErrors };
}
