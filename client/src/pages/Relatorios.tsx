import { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardFilters, { FilterState } from "@/components/DashboardFilters";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, AlertTriangle, Clock, CheckCircle2, List, BarChart2, Search, X } from "lucide-react";

type StatusTab = "todos" | "pago" | "em_aberto" | "atrasado";

function formatCurrency(value: number): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

const MESES_ABREV = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function Relatorios() {
  const [filters, setFilters] = useState<FilterState>({
    unidade: [], mesPagamento: [], anoPagamento: [], especialidade: [], tipoPlantao: [],
  });
  const [statusTab, setStatusTab] = useState<StatusTab>("todos");
  const [statusPlanilha, setStatusPlanilha] = useState<"todos" | "CONCLUIDO" | "PENDENTE">("todos");
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const PAGE_SIZE = 25;

  // Debounce simples: aplica busca ao pressionar Enter ou clicar no X
  const handleBuscaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setBusca(buscaInput);
      setPage(1);
    }
  };

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuscaInput(e.target.value);
    // Aplica em tempo real com pequeno debounce via useCallback
    applyBuscaDebounced(e.target.value);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const applyBuscaDebounced = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (value: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          setBusca(value);
          setPage(1);
        }, 400);
      };
    })(),
    []
  );

  const clearBusca = () => {
    setBuscaInput("");
    setBusca("");
    setPage(1);
  };

  const toFV = <T extends string | number>(arr: T[]) =>
    arr.length === 0 ? undefined : arr.length === 1 ? arr[0] : arr;

  const filterInput = {
    unidade: toFV(filters.unidade),
    mesPagamento: toFV(filters.mesPagamento),
    anoPagamento: toFV(filters.anoPagamento),
    especialidade: toFV(filters.especialidade),
    tipoPlantao: toFV(filters.tipoPlantao),
    busca: busca.trim() || undefined,
    status: statusTab,
    statusPlanilha: statusPlanilha !== "todos" ? statusPlanilha : undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const filterInputBase = {
    unidade: toFV(filters.unidade),
    mesPagamento: toFV(filters.mesPagamento),
    anoPagamento: toFV(filters.anoPagamento),
    especialidade: toFV(filters.especialidade),
    tipoPlantao: toFV(filters.tipoPlantao),
  };

  const { data, isLoading } = trpc.plantoes.list.useQuery(filterInput);
  const { data: resumo } = trpc.plantoes.resumoFinanceiro.useQuery(filterInputBase);

  const handleTabChange = (tab: StatusTab) => {
    setStatusTab(tab);
    setPage(1);
  };

  const handleFilterChange = (f: FilterState) => {
    setFilters(f);
    setPage(1);
  };

  const handleStatusPlanilhaChange = (v: "todos" | "CONCLUIDO" | "PENDENTE") => {
    setStatusPlanilha(v);
    setPage(1);
  };

  // Exportar CSV
  const exportCSV = () => {
    if (!data?.items?.length) return;
    const headers = ["Sol. NF", "Mês Pagto", "Médico", "Razão Social", "Unidade", "Especialidade", "Tipo Plantão", "Valor Bruto", "Valor Líquido", "Nota Fiscal", "Vencimento Calculado", "Regra Vencimento", "Dt Pagamento", "Dias Atraso", "Status", "Status Planilha"];
    const rows = data.items.map((p: any) => [
      formatDate(p.solNf),
      `${MESES_ABREV[p.mesPagamento]}/${p.anoPagamento}`,
      p.medico,
      p.razaoSocial || "",
      p.unidade,
      p.especialidade || "",
      p.tipoPlantao || "",
      Number(p.valorBruto).toFixed(2),
      Number(p.valorLiquido).toFixed(2),
      p.notaFiscal || "",
      formatDate(p.dataVencimento),
      p.regraVencimento || "",
      formatDate(p.dataPagto),
      p.diasAtraso ?? "",
      p.dataPagto ? "Pago" : p.diasAtraso > 0 ? "Atrasado" : "Em Aberto",
      p.status === "CONCLUIDO" ? "Concluído" : "Pendente",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: StatusTab; label: string; icon: React.ReactNode }[] = [
    { key: "todos", label: "Todos Ativos", icon: <List size={14} /> },
    { key: "em_aberto", label: "Em Aberto", icon: <Clock size={14} /> },
    { key: "atrasado", label: "Atrasados", icon: <AlertTriangle size={14} /> },
    { key: "pago", label: "Pagos", icon: <CheckCircle2 size={14} /> },
  ];

  const totalBruto = Number(resumo?.totalBruto || 0);
  const totalLiquido = Number(resumo?.totalLiquido || 0);
  const totalPago = Number(resumo?.totalPago || 0);
  const totalEmAberto = Number(resumo?.totalEmAberto || 0);
  const totalRetencoes = totalBruto - totalLiquido;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-lg font-bold text-foreground">Relatório Detalhado</h1>
          <p className="text-xs text-muted-foreground">Visualize e exporte os dados de plantões com filtros avançados</p>
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-xl border border-border px-4 py-3 shadow-sm">
          <DashboardFilters filters={filters} onChange={handleFilterChange} />

          {/* Campo de busca + filtro de status da planilha */}
          <div className="mt-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Buscar Médico
              </span>
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Nome do médico ou razão social..."
                  value={buscaInput}
                  onChange={handleBuscaChange}
                  onKeyDown={handleBuscaKeyDown}
                  className="pl-8 pr-8 h-8 text-xs"
                />
                {buscaInput && (
                  <button
                    onClick={clearBusca}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Limpar busca"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {busca && (
                <span className="text-xs text-primary font-medium">
                  Filtrando por: <span className="italic">"{busca}"</span>
                </span>
              )}
              {/* Filtro de status da planilha */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Status Planilha
                </span>
                <div className="flex gap-1">
                  {(["todos", "CONCLUIDO", "PENDENTE"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusPlanilhaChange(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        statusPlanilha === s
                          ? s === "CONCLUIDO"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : s === "PENDENTE"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {s === "todos" ? "Todos" : s === "CONCLUIDO" ? "Concluído" : "Pendente"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores Financeiros */}
        {resumo && (
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Indicadores Financeiros</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Valor Bruto Total", value: totalBruto, color: "text-foreground" },
                { label: "Valor Líquido Total", value: totalLiquido, color: "text-foreground" },
                { label: "Total Retenções", value: totalRetencoes, color: "text-red-500", prefix: "-" },
                { label: "Valor Pago", value: totalPago, color: "text-emerald-600" },
                { label: "Saldo em Aberto", value: totalEmAberto, color: totalEmAberto > 0 ? "text-amber-600" : "text-emerald-600" },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>
                    {item.prefix && item.value > 0 ? item.prefix : ""}{formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Tabs + Export */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5">
              <Download size={13} />
              Exportar CSV
            </Button>
          </div>

          {/* Info */}
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {isLoading
                ? "Carregando..."
                : `Exibindo ${data?.total === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, data?.total || 0)} de ${data?.total || 0} registros`}
              {busca && (
                <span className="ml-2 text-primary font-medium">
                  · Busca: "{busca}"
                </span>
              )}
            </span>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap" title="Data de Solicitação de Nota Fiscal">Sol. NF</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Mês de Pagamento</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Médico</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Unidade</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Especialidade</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Valor Bruto</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Valor Líquido</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Vencimento Calculado</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Dias Atraso</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap" title="Status importado da planilha">Status Planilha</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Dt Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 12 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                      {busca
                        ? `Nenhum médico encontrado para "${busca}". Tente outro termo de busca.`
                        : "Nenhum registro encontrado para os filtros selecionados."}
                    </td>
                  </tr>
                ) : (
                  data?.items?.map((p: any) => {
                    const isPago = !!p.dataPagto;
                    const isAtrasado = !isPago && p.diasAtraso > 0;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">{formatDate(p.solNf)}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{MESES_ABREV[p.mesPagamento]}/{p.anoPagamento}</td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="font-semibold text-foreground truncate">{p.medico}</div>
                          {p.razaoSocial && <div className="text-muted-foreground truncate">{p.razaoSocial}</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.unidade}</td>
                        <td className="px-4 py-3 max-w-[140px]">
                          <div className="text-foreground truncate">{p.especialidade || "—"}</div>
                          {p.tipoPlantao && p.tipoPlantao !== p.especialidade && (
                            <div className="text-muted-foreground truncate">{p.tipoPlantao}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{formatCurrency(Number(p.valorBruto))}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap">{formatCurrency(Number(p.valorLiquido))}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.dataVencimento ? (
                            <div>
                              <div className="font-medium text-foreground">{formatDate(p.dataVencimento)}</div>
                              {p.regraVencimento && (
                                <div className="text-muted-foreground text-[10px]">{p.regraVencimento}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {p.diasAtraso > 0 ? (
                            <span className="font-bold text-red-500">{p.diasAtraso}d</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isPago ? (
                            <Badge className="badge-pago text-xs px-2 py-0.5">Pago</Badge>
                          ) : isAtrasado ? (
                            <Badge className="badge-atrasado text-xs px-2 py-0.5">Atrasado</Badge>
                          ) : (
                            <Badge className="badge-aberto text-xs px-2 py-0.5">Em Aberto</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {p.status === "CONCLUIDO" ? (
                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-2 py-0.5">Concluído</Badge>
                          ) : p.status === "PENDENTE" ? (
                            <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-xs px-2 py-0.5">Pendente</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(p.dataPagto)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Página {page} de {data.totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="h-7 w-7 p-0">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
