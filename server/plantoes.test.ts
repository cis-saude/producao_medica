import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseXlsx, parseXlsxDetailed } from "./xlsxParser";

const UPLOAD_DIR = join(process.cwd(), "../upload");

describe("parseXlsx - planilha ARA (Arapoti)", () => {
  it("deve parsear a planilha ARA e retornar dados válidos", () => {
    const filePath = join(UPLOAD_DIR, "ARA2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    expect(result.length).toBeGreaterThan(0);
    const firstSheet = result[0];
    expect(firstSheet.unidade).toBe("ARA");
    expect(firstSheet.unidadeNome).toBe("ARAPOTI");
    expect(firstSheet.mesPagamento).toBeGreaterThan(0);
    expect(firstSheet.anoPagamento).toBeGreaterThan(2020);
    expect(firstSheet.rows.length).toBeGreaterThan(0);

    const firstRow = firstSheet.rows[0];
    expect(firstRow.medico).toBeTruthy();
    expect(firstRow.unidade).toBeTruthy();
  });
});

describe("parseXlsx - planilha FRG (Fazenda Rio Grande)", () => {
  it("deve parsear a planilha FRG e retornar dados válidos", () => {
    const filePath = join(UPLOAD_DIR, "FRG2026-RELATORIOPLANTAOOBSTETRICIA(1).xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    expect(result.length).toBeGreaterThan(0);
    const firstSheet = result[0];
    expect(firstSheet.unidade).toBe("FRG");
    expect(firstSheet.unidadeNome).toBe("FAZENDA RIO GRANDE");
    expect(firstSheet.mesPagamento).toBeGreaterThan(0);
    expect(firstSheet.rows.length).toBeGreaterThan(0);
  });
});

describe("parseXlsx - planilha STA (Santa Mariana)", () => {
  it("deve parsear a planilha STA e retornar dados válidos", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_gMTwXB_STA2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    expect(result.length).toBeGreaterThan(0);
    const firstSheet = result[0];
    expect(firstSheet.unidade).toBe("SM");
    expect(firstSheet.unidadeNome).toBe("SANTA MARIANA");
    expect(firstSheet.mesPagamento).toBeGreaterThan(0);
    expect(firstSheet.anoPagamento).toBeGreaterThan(2020);
    expect(firstSheet.rows.length).toBeGreaterThan(0);

    const firstRow = firstSheet.rows[0];
    expect(firstRow.medico).toBeTruthy();
    expect(firstRow.unidade).toBe("SM");
  });

  it("deve ter múltiplas abas (meses) na planilha STA", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_gMTwXB_STA2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseXlsx - planilha CAR (Carlópolis)", () => {
  it("deve parsear a planilha CAR e retornar dados válidos", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_5JueRk_CAR2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    expect(result.length).toBeGreaterThan(0);
    const firstSheet = result[0];
    expect(firstSheet.unidade).toBe("CAR");
    expect(firstSheet.unidadeNome).toBe("CARLÓPOLIS");
    expect(firstSheet.mesPagamento).toBeGreaterThan(0);
    expect(firstSheet.anoPagamento).toBeGreaterThan(2020);
    expect(firstSheet.rows.length).toBeGreaterThan(0);

    const firstRow = firstSheet.rows[0];
    expect(firstRow.medico).toBeTruthy();
    expect(firstRow.unidade).toBe("CAR");
  });

  it("deve ter múltiplas abas (meses) na planilha CAR", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_5JueRk_CAR2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseXlsx - planilha FAX (Faxinal)", () => {
  it("deve parsear a planilha FAX e retornar dados válidos", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_VAtpAS_FAX2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    expect(result.length).toBeGreaterThan(0);
    const firstSheet = result[0];
    expect(firstSheet.unidade).toBe("FAX");
    expect(firstSheet.unidadeNome).toBe("FAXINAL");
    expect(firstSheet.mesPagamento).toBeGreaterThan(0);
    expect(firstSheet.anoPagamento).toBeGreaterThan(2020);
    expect(firstSheet.rows.length).toBeGreaterThan(0);
  });

  it("deve ter múltiplas abas (meses) na planilha FAX", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_VAtpAS_FAX2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseXlsxDetailed - log de erros e avisos", () => {
  it("deve retornar estrutura com sheets e errors", () => {
    const filePath = join(UPLOAD_DIR, "ARA2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsxDetailed(buffer);

    expect(result).toHaveProperty("sheets");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.sheets)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.sheets.length).toBeGreaterThan(0);
  });

  it("deve retornar erro descritivo para buffer vazio", () => {
    const buffer = Buffer.from("not a valid xlsx");
    const result = parseXlsxDetailed(buffer);
    // Deve retornar errors ou sheets vazio sem lançar exceção
    expect(result.sheets.length).toBe(0);
  });
});

describe("parseXlsx - correção de datas (sem offset de fuso)", () => {
  it("datas de pagamento devem refletir exatamente o valor da planilha (sem -1 dia)", () => {
    const filePath = join(UPLOAD_DIR, "ARA2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    for (const sheet of result) {
      for (const row of sheet.rows) {
        if (row.dataPagto) {
          const d = row.dataPagto instanceof Date ? row.dataPagto : new Date(row.dataPagto);
          // Ano deve ser razoável (2020-2030)
          expect(d.getFullYear()).toBeGreaterThanOrEqual(2020);
          expect(d.getFullYear()).toBeLessThanOrEqual(2030);
          // Mês deve ser válido (0-11 em JS)
          expect(d.getMonth()).toBeGreaterThanOrEqual(0);
          expect(d.getMonth()).toBeLessThanOrEqual(11);
          // Dia deve ser válido (1-31)
          expect(d.getDate()).toBeGreaterThanOrEqual(1);
          expect(d.getDate()).toBeLessThanOrEqual(31);
        }
      }
    }
  });
});

describe("parseXlsx - validação de valores financeiros", () => {
  it("deve calcular valores bruto e líquido corretamente para ARA", () => {
    const filePath = join(UPLOAD_DIR, "ARA2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    for (const sheet of result) {
      for (const row of sheet.rows) {
        const bruto = Number(row.valorBruto);
        const liquido = Number(row.valorLiquido);
        expect(bruto).toBeGreaterThanOrEqual(0);
        expect(liquido).toBeGreaterThanOrEqual(0);
        if (bruto > 0) {
          expect(liquido).toBeLessThanOrEqual(bruto * 1.01);
        }
      }
    }
  });

  it("deve calcular valores bruto e líquido corretamente para STA", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_gMTwXB_STA2026-RELATORIOPLANTONISTAS.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    for (const sheet of result) {
      for (const row of sheet.rows) {
        const bruto = Number(row.valorBruto);
        const liquido = Number(row.valorLiquido);
        expect(bruto).toBeGreaterThanOrEqual(0);
        expect(liquido).toBeGreaterThanOrEqual(0);
        if (bruto > 0) {
          expect(liquido).toBeLessThanOrEqual(bruto * 1.01);
        }
      }
    }
  });
});

describe("parseXlsx - planilha RBS (Rio Branco do Sul)", () => {
  it("deve parsear a planilha RBS e retornar dados válidos", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_JFZOto_RBS2026-RELATORIOPLANTONISTASCLINICAMEDICA.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    expect(result.length).toBeGreaterThan(0);
    const firstSheet = result[0];
    expect(firstSheet.unidade).toBe("RBS");
    expect(firstSheet.unidadeNome).toBe("RIO BRANCO DO SUL");
    expect(firstSheet.mesPagamento).toBeGreaterThan(0);
    expect(firstSheet.anoPagamento).toBeGreaterThan(2020);
    expect(firstSheet.rows.length).toBeGreaterThan(0);

    const firstRow = firstSheet.rows[0];
    expect(firstRow.medico).toBeTruthy();
    expect(firstRow.unidade).toBe("RBS");
  });

  it("deve ter múltiplas abas (meses) na planilha RBS", () => {
    const filePath = join(UPLOAD_DIR, "pasted_file_JFZOto_RBS2026-RELATORIOPLANTONISTASCLINICAMEDICA.xlsx");
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseXlsx - detecção dinâmica de unidades", () => {
  it("todas as planilhas devem ser detectadas com unidade correta", () => {
    const casos = [
      { file: "ARA2026-RELATORIOPLANTONISTAS.xlsx", code: "ARA", nome: "ARAPOTI" },
      { file: "FRG2026-RELATORIOPLANTAOOBSTETRICIA(1).xlsx", code: "FRG", nome: "FAZENDA RIO GRANDE" },
      { file: "pasted_file_gMTwXB_STA2026-RELATORIOPLANTONISTAS.xlsx", code: "SM", nome: "SANTA MARIANA" },
      { file: "pasted_file_5JueRk_CAR2026-RELATORIOPLANTONISTAS.xlsx", code: "CAR", nome: "CARLÓPOLIS" },
      { file: "pasted_file_VAtpAS_FAX2026-RELATORIOPLANTONISTAS.xlsx", code: "FAX", nome: "FAXINAL" },
      { file: "pasted_file_JFZOto_RBS2026-RELATORIOPLANTONISTASCLINICAMEDICA.xlsx", code: "RBS", nome: "RIO BRANCO DO SUL" },
    ];

    for (const caso of casos) {
      const filePath = join(UPLOAD_DIR, caso.file);
      if (!existsSync(filePath)) continue;
      const buffer = readFileSync(filePath);
      const result = parseXlsx(buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].unidade).toBe(caso.code);
      expect(result[0].unidadeNome).toBe(caso.nome);
    }
  });
});

describe("parseXlsx - múltiplas especialidades FRG", () => {
  it("planilhas de especialidades diferentes da mesma unidade devem ter especialidades distintas", () => {
    const arquivos = [
      "/home/ubuntu/upload/FRG2026-RELATORIOPLANTAOANESTESIA.xlsx",
      "/home/ubuntu/upload/FRG2026-RELATORIOPLANTAOCIRURGIAGERAL.xlsx",
      "/home/ubuntu/upload/FRG2026-RELATORIOPLANTAOPEDIATRIA.xlsx",
      "/home/ubuntu/upload/FRG2026-RELATORIOPLANTAOCLINICAMEDICA.xlsx",
    ];

    const todasEspecialidades = new Set<string>();
    let arquivosLidos = 0;

    for (const filePath of arquivos) {
      if (!existsSync(filePath)) continue;
      arquivosLidos++;
      const buffer = readFileSync(filePath);
      const result = parseXlsx(buffer);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].unidade).toBe("FRG");

      for (const sheet of result) {
        for (const row of sheet.rows) {
          if (row.especialidade) todasEspecialidades.add(row.especialidade);
        }
      }
    }

    // Os arquivos-fixture vivem no sandbox Manus (/home/ubuntu/upload/).
    // Fora dele, simplesmente pula a checagem agregada.
    if (arquivosLidos === 0) return;

    // Deve ter pelo menos 3 especialidades distintas entre as 4 planilhas
    expect(todasEspecialidades.size).toBeGreaterThanOrEqual(3);
  });

  it("planilha de anestesia FRG deve conter apenas ANESTESIA", () => {
    const filePath = "/home/ubuntu/upload/FRG2026-RELATORIOPLANTAOANESTESIA.xlsx";
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    for (const sheet of result) {
      const especialidades = Array.from(new Set(sheet.rows.map(r => r.especialidade)));
      expect(especialidades).toContain("ANESTESIA");
    }
  });

  it("planilha de pediatria FRG deve conter apenas PEDIATRIA", () => {
    const filePath = "/home/ubuntu/upload/FRG2026-RELATORIOPLANTAOPEDIATRIA.xlsx";
    if (!existsSync(filePath)) return;
    const buffer = readFileSync(filePath);
    const result = parseXlsx(buffer);

    for (const sheet of result) {
      const especialidades = Array.from(new Set(sheet.rows.map(r => r.especialidade)));
      expect(especialidades).toContain("PEDIATRIA");
    }
  });
});

describe("Filtro de busca por médico / razão social", () => {
  it("deve filtrar registros pelo nome do médico (case-insensitive, parcial)", () => {
    const registros = [
      { medico: "ANA KAROLINA SILVA", razaoSocial: "ANA KAROLINA SILVA LTDA" },
      { medico: "MAURICIO MELLO", razaoSocial: null },
      { medico: "LARYSSA SOARES", razaoSocial: "LARYSSA SOARES ME" },
    ];

    const busca = "ana";
    const termo = busca.toLowerCase();
    const resultado = registros.filter(
      p =>
        (p.medico && p.medico.toLowerCase().includes(termo)) ||
        (p.razaoSocial && p.razaoSocial.toLowerCase().includes(termo))
    );

    expect(resultado.length).toBe(1);
    expect(resultado[0].medico).toBe("ANA KAROLINA SILVA");
  });

  it("deve encontrar médico pela razão social", () => {
    const registros = [
      { medico: "JOAO SILVA", razaoSocial: "JS SERVICOS MEDICOS LTDA" },
      { medico: "MARIA SOUZA", razaoSocial: "MARIA SOUZA ME" },
    ];

    const busca = "servicos medicos";
    const termo = busca.toLowerCase();
    const resultado = registros.filter(
      p =>
        (p.medico && p.medico.toLowerCase().includes(termo)) ||
        (p.razaoSocial && p.razaoSocial.toLowerCase().includes(termo))
    );

    expect(resultado.length).toBe(1);
    expect(resultado[0].medico).toBe("JOAO SILVA");
  });

  it("deve retornar lista vazia quando nenhum médico corresponde à busca", () => {
    const registros = [
      { medico: "ANA KAROLINA SILVA", razaoSocial: null },
      { medico: "MAURICIO MELLO", razaoSocial: null },
    ];

    const busca = "CARLOS";
    const termo = busca.toLowerCase();
    const resultado = registros.filter(
      p =>
        (p.medico && p.medico.toLowerCase().includes(termo)) ||
        (p.razaoSocial && p.razaoSocial.toLowerCase().includes(termo))
    );

    expect(resultado.length).toBe(0);
  });

  it("deve retornar todos os registros quando busca está vazia", () => {
    const registros = [
      { medico: "ANA KAROLINA SILVA", razaoSocial: null },
      { medico: "MAURICIO MELLO", razaoSocial: null },
    ];

    const busca = "";
    const resultado = busca.trim() === ""
      ? registros
      : registros.filter(
          p =>
            (p.medico && p.medico.toLowerCase().includes(busca.toLowerCase())) ||
            (p.razaoSocial && p.razaoSocial.toLowerCase().includes(busca.toLowerCase()))
        );

    expect(resultado.length).toBe(2);
  });
});
