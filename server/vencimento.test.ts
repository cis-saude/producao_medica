import { describe, expect, it } from "vitest";
import { calcularVencimento, calcularDiasAtraso } from "./vencimento";

describe("calcularVencimento - Grupo 1 (dia 15 fixo)", () => {
  it("ARA Jan/2026: dia 15 é quinta-feira → vencimento 15/01/2026", () => {
    const info = calcularVencimento("ARA", 1, 2026);
    expect(info).not.toBeNull();
    expect(info!.dataVencimento.getDate()).toBe(15);
    expect(info!.dataVencimento.getMonth()).toBe(0); // Janeiro
    expect(info!.dataVencimento.getFullYear()).toBe(2026);
    expect(info!.regra).toBe("Dia 15 fixo");
  });

  it("SM Fev/2026: dia 15 é domingo → avança para 18/02/2026 (16 e 17 são Carnaval)", () => {
    const info = calcularVencimento("SM", 2, 2026);
    expect(info).not.toBeNull();
    // 15/02/2026 é domingo
    // 16/02/2026 é segunda mas é Carnaval (feriado)
    // 17/02/2026 é terça mas é Carnaval (feriado)
    // 18/02/2026 é quarta-feira → primeiro dia útil
    expect(info!.dataVencimento.getDate()).toBe(18);
    expect(info!.dataVencimento.getMonth()).toBe(1); // Fevereiro
    expect(info!.dataVencimento.getFullYear()).toBe(2026);
  });

  it("CAR Nov/2026: dia 15 é domingo (feriado República) → avança para segunda 16/11/2026", () => {
    const info = calcularVencimento("CAR", 11, 2026);
    expect(info).not.toBeNull();
    // 15/11/2026 é domingo E feriado (Proclamação da República)
    // 16/11/2026 é segunda-feira (Consciência Negra é dia 20, não dia 16) → resultado: 16/11
    expect(info!.dataVencimento.getDate()).toBe(16);
  });

  it("FAX: unidade desconhecida não retorna null", () => {
    const info = calcularVencimento("FAX", 3, 2026);
    expect(info).not.toBeNull();
    expect(info!.grupo).toBe(1);
  });

  it("APU: retorna grupo 1", () => {
    const info = calcularVencimento("APU", 6, 2026);
    expect(info).not.toBeNull();
    expect(info!.grupo).toBe(1);
  });
});

describe("calcularVencimento - Grupo 2 (15º dia útil)", () => {
  it("FRG Jan/2026: 15º dia útil deve ser 22/01/2026", () => {
    const info = calcularVencimento("FRG", 1, 2026);
    expect(info).not.toBeNull();
    // Jan/2026: dias úteis contando a partir de 02/01 (01/01 é feriado)
    // 02, 05, 06, 07, 08, 09, 12, 13, 14, 15, 16, 19, 20, 21, 22 → 15º = 22/01
    expect(info!.dataVencimento.getDate()).toBe(22);
    expect(info!.dataVencimento.getMonth()).toBe(0);
    expect(info!.grupo).toBe(2);
    expect(info!.regra).toBe("15º dia útil");
  });

  it("RBS Fev/2026: 15º dia útil calculado corretamente", () => {
    const info = calcularVencimento("RBS", 2, 2026);
    expect(info).not.toBeNull();
    // Fev/2026: 02, 03, 04, 05, 06, 09, 10, 11, 12, 13, 18, 19, 20, 24, 25
    // (14-15/02 são sábado/domingo; 16-17/02 são Carnaval)
    // Dias úteis: 02,03,04,05,06,09,10,11,12,13,18,19,20,23,24 → 15º = 24/02/2026
    expect(info!.dataVencimento.getDate()).toBe(24);
    expect(info!.dataVencimento.getMonth()).toBe(1);
    expect(info!.grupo).toBe(2);
  });

  it("FOZ: retorna grupo 2", () => {
    const info = calcularVencimento("FOZ", 3, 2026);
    expect(info).not.toBeNull();
    expect(info!.grupo).toBe(2);
  });
});

describe("calcularVencimento - Grupo 3 (20º dia útil)", () => {
  it("GUA Jan/2026: 20º dia útil calculado corretamente", () => {
    const info = calcularVencimento("GUA", 1, 2026);
    expect(info).not.toBeNull();
    // Jan/2026: 02,05,06,07,08,09,12,13,14,15,16,19,20,21,22,23,26,27,28,29 → 20º = 29/01
    expect(info!.dataVencimento.getDate()).toBe(29);
    expect(info!.dataVencimento.getMonth()).toBe(0);
    expect(info!.grupo).toBe(3);
    expect(info!.regra).toBe("20º dia útil");
  });

  it("GUA Mar/2026: 20º dia útil calculado corretamente", () => {
    const info = calcularVencimento("GUA", 3, 2026);
    expect(info).not.toBeNull();
    expect(info!.grupo).toBe(3);
    // Deve ser um dia útil
    const dow = info!.dataVencimento.getDay();
    expect(dow).not.toBe(0); // não domingo
    expect(dow).not.toBe(6); // não sábado
  });
});

describe("calcularVencimento - Unidade desconhecida", () => {
  it("Unidade não mapeada retorna null", () => {
    const info = calcularVencimento("XYZ_DESCONHECIDA", 1, 2026);
    expect(info).toBeNull();
  });
});

describe("calcularDiasAtraso", () => {
  it("Pago antes do vencimento: 0 dias de atraso", () => {
    // ARA Jan/2026: vencimento 15/01/2026
    const dataPagto = new Date(2026, 0, 10); // 10/01/2026
    const result = calcularDiasAtraso("ARA", 1, 2026, dataPagto);
    expect(result.diasAtraso).toBe(0);
    expect(result.dataVencimento).not.toBeNull();
  });

  it("Pago no dia do vencimento: 0 dias de atraso", () => {
    const dataPagto = new Date(2026, 0, 15); // 15/01/2026
    const result = calcularDiasAtraso("ARA", 1, 2026, dataPagto);
    expect(result.diasAtraso).toBe(0);
  });

  it("Pago 5 dias após vencimento: 5 dias de atraso", () => {
    // ARA Jan/2026: vencimento 15/01/2026
    const dataPagto = new Date(2026, 0, 20); // 20/01/2026
    const result = calcularDiasAtraso("ARA", 1, 2026, dataPagto);
    expect(result.diasAtraso).toBe(5);
  });

  it("Não pago e já vencido: retorna dias em atraso positivo", () => {
    // ARA Jan/2026: vencimento 15/01/2026; hoje = 20/01/2026
    const hoje = new Date(2026, 0, 20);
    const result = calcularDiasAtraso("ARA", 1, 2026, null, hoje);
    expect(result.diasAtraso).toBe(5);
  });

  it("Não pago e ainda não venceu: 0 dias de atraso", () => {
    // ARA Jan/2026: vencimento 15/01/2026; hoje = 10/01/2026
    const hoje = new Date(2026, 0, 10);
    const result = calcularDiasAtraso("ARA", 1, 2026, null, hoje);
    expect(result.diasAtraso).toBe(0);
  });

  it("Unidade sem regra: retorna null para diasAtraso", () => {
    const result = calcularDiasAtraso("XYZ_DESCONHECIDA", 1, 2026, null);
    expect(result.diasAtraso).toBeNull();
    expect(result.dataVencimento).toBeNull();
  });
});
