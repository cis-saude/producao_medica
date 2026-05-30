import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardFilters, { FilterState } from "@/components/DashboardFilters";
import SummaryCards from "@/components/SummaryCards";
import { FaturamentoMesChart, StatusPagamentoChart, TopMedicosChart, ResumoUnidadeChart } from "@/components/DashboardCharts";
import { trpc } from "@/lib/trpc";
import { Building2, TrendingDown, Award, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

function formatCurrency(value: number): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Home() {
  const [filters, setFilters] = useState<FilterState>({
    unidade: [], mesPagamento: [], anoPagamento: [], especialidade: [], tipoPlantao: [],
  });
  const filterInput = {
    unidade: filters.unidade.length > 0 ? (filters.unidade.length === 1 ? filters.unidade[0] : filters.unidade) : undefined,
    mesPagamento: filters.mesPagamento.length > 0 ? (filters.mesPagamento.length === 1 ? filters.mesPagamento[0] : filters.mesPagamento) : undefined,
    anoPagamento: filters.anoPagamento.length > 0 ? (filters.anoPagamento.length === 1 ? filters.anoPagamento[0] : filters.anoPagamento) : undefined,
    especialidade: filters.especialidade.length > 0 ? (filters.especialidade.length === 1 ? filters.especialidade[0] : filters.especialidade) : undefined,
    tipoPlantao: filters.tipoPlantao.length > 0 ? (filters.tipoPlantao.length === 1 ? filters.tipoPlantao[0] : filters.tipoPlantao) : undefined,
  };

  const { data: resumo, isLoading: loadingResumo } = trpc.plantoes.resumoFinanceiro.useQuery(filterInput);
  const { data: resumoMes = [] } = trpc.plantoes.resumoByMes.useQuery(filterInput);
  const { data: topMedicos = [] } = trpc.plantoes.topMedicos.useQuery({ ...filterInput, limit: 5 });
  const { data: resumoUnidade = [] } = trpc.plantoes.resumoByUnidade.useQuery(filterInput);
  const { data: resumoEspecialidade = [] } = trpc.plantoes.resumoByEspecialidade.useQuery(filterInput);
  const { data: pontualidade = [] } = trpc.plantoes.pontualidade.useQuery(filterInput);

  // Média geral de pontualidade
  const mediaPontualidade = pontualidade.length > 0
    ? Math.round(pontualidade.reduce((sum: number, u: any) => sum + u.indicePontualidade, 0) / pontualidade.length)
    : null;

  const totalPago = Number(resumo?.totalPago || 0);
  const totalEmAberto = Number(resumo?.totalEmAberto || 0);

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-5">
        {/* Header + Filtros */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Dashboard de Plantões</h1>
              <p className="text-xs text-muted-foreground">Gestão financeira e administrativa de plantões médicos</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border px-4 py-3 shadow-sm">
            <DashboardFilters filters={filters} onChange={setFilters} />
          </div>
        </div>

        {/* Cards de resumo */}
        <SummaryCards data={resumo} loading={loadingResumo} />

        {/* Gráficos principais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <FaturamentoMesChart data={resumoMes as any} />
          </div>
          <div className="lg:col-span-1">
            <StatusPagamentoChart pago={totalPago} emAberto={totalEmAberto} />
          </div>
          <div className="lg:col-span-1">
            <TopMedicosChart data={topMedicos as any} />
          </div>
        </div>

        {/* Resumo por unidade */}
        {resumoUnidade.length > 1 && (
          <ResumoUnidadeChart data={resumoUnidade as any} />
        )}

        {/* Tabelas de resumo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Resumo por unidade */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Resumo por Unidade</h3>
            </div>
            {resumoUnidade.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-3">
                {resumoUnidade.map((u: any) => {
                  const perc = Number(u.totalLiquido) > 0
                    ? Math.round((Number(u.totalPago) / Number(u.totalLiquido)) * 100)
                    : 0;
                  return (
                    <div key={u.unidade} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-foreground">{u.unidade}</span>
                          <span className="text-xs text-muted-foreground ml-2">{u.totalMedicos} médicos · {u.totalPlantoes} plantões</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatCurrency(Number(u.totalLiquido))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${perc}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{perc}%</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Bruto: <span className="font-medium text-foreground">{formatCurrency(Number(u.totalBruto))}</span></span>
                        <span>Pago: <span className="font-medium text-emerald-600">{formatCurrency(Number(u.totalPago))}</span></span>
                        <span>Aberto: <span className={`font-medium ${Number(u.totalEmAberto) > 0 ? "text-amber-600" : "text-emerald-600"}`}>{formatCurrency(Number(u.totalEmAberto))}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo por especialidade */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Resumo por Especialidade / Plantão</h3>
            </div>
            {resumoEspecialidade.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum dado disponível</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-semibold">Especialidade / Tipo</th>
                      <th className="text-right py-2 text-muted-foreground font-semibold">Bruto</th>
                      <th className="text-right py-2 text-muted-foreground font-semibold">Líquido</th>
                      <th className="text-right py-2 text-muted-foreground font-semibold">Pago</th>
                      <th className="text-right py-2 text-muted-foreground font-semibold">Aberto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoEspecialidade.map((e: any, i: number) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-2">
                          <div className="font-medium text-foreground">{e.especialidade || "—"}</div>
                          {e.tipoPlantao && e.tipoPlantao !== e.especialidade && (
                            <div className="text-muted-foreground">{e.tipoPlantao}</div>
                          )}
                        </td>
                        <td className="py-2 text-right text-foreground font-medium">{formatCurrency(Number(e.totalBruto))}</td>
                        <td className="py-2 text-right text-foreground">{formatCurrency(Number(e.totalLiquido))}</td>
                        <td className="py-2 text-right text-emerald-600">{formatCurrency(Number(e.totalPago))}</td>
                        <td className={`py-2 text-right font-medium ${Number(e.totalEmAberto) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {formatCurrency(Number(e.totalEmAberto))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Card de Índice de Pontualidade */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Índice de Pontualidade de Pagamentos</h3>
              <p className="text-xs text-muted-foreground">Percentual de pagamentos realizados no prazo por unidade</p>
            </div>
            {mediaPontualidade !== null && (
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Média geral:</span>
                <span className={`text-sm font-bold ${
                  mediaPontualidade >= 80 ? "text-emerald-600" :
                  mediaPontualidade >= 50 ? "text-amber-600" : "text-red-600"
                }`}>{mediaPontualidade}%</span>
              </div>
            )}
          </div>

          {pontualidade.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum dado disponível</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(pontualidade as any[]).map((u) => {
                const isGood = u.indicePontualidade >= 80;
                const isMid = u.indicePontualidade >= 50 && u.indicePontualidade < 80;
                const isBad = u.indicePontualidade < 50;
                const colorClass = isGood ? "text-emerald-600" : isMid ? "text-amber-600" : "text-red-600";
                const bgClass = isGood ? "bg-emerald-50 border-emerald-200" : isMid ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
                const barColor = isGood ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-red-500";
                const Icon = isGood ? CheckCircle2 : isBad ? AlertTriangle : Clock;
                return (
                  <div key={u.unidade} className={`rounded-lg border p-3 ${bgClass}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Icon size={14} className={colorClass} />
                        <span className="text-sm font-bold text-foreground">{u.unidade}</span>
                      </div>
                      <span className={`text-lg font-bold ${colorClass}`}>{u.indicePontualidade}%</span>
                    </div>
                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-2">
                      <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${u.indicePontualidade}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div className="text-center">
                        <div className="font-bold text-emerald-700">{u.pagosNoPrazo}</div>
                        <div className="text-muted-foreground">No prazo</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-red-600">{u.pagosEmAtraso}</div>
                        <div className="text-muted-foreground">Atrasados</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-amber-600">{u.emAberto}</div>
                        <div className="text-muted-foreground">Em aberto</div>
                      </div>
                    </div>
                    {u.mediaDiasAtraso > 0 && (
                      <div className="mt-1.5 text-[10px] text-muted-foreground text-center">
                        Média atraso: <span className="font-semibold text-red-600">{u.mediaDiasAtraso} dias</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Indicadores Financeiros foram movidos para a aba de Relatórios */}
      </div>
    </DashboardLayout>
  );
}
