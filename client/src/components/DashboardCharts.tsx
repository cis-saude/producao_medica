import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const MESES_ABREV = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CIS_GREEN = "#3a7d5a";
const CIS_LIGHT_GREEN = "#5aab7e";
const CIS_GRAY = "#4a5568";

function formatK(value: number) {
  if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface MesData {
  mesPagamento: number;
  anoPagamento: number;
  totalBruto: number;
  totalLiquido: number;
  totalPago: number;
  totalEmAberto: number;
}

interface MedicoData {
  medico: string;
  razaoSocial: string | null;
  totalBruto: number;
  totalLiquido: number;
}

interface UnidadeData {
  unidade: string;
  totalBruto: number;
  totalLiquido: number;
  totalPago: number;
  totalEmAberto: number;
  totalMedicos: number;
  totalPlantoes: number;
}

// Gráfico de barras: Faturamento por mês
export function FaturamentoMesChart({ data }: { data: MesData[] }) {
  const chartData = data.map(d => ({
    name: `${MESES_ABREV[d.mesPagamento]}/${d.anoPagamento}`,
    Bruto: Number(d.totalBruto),
    Líquido: Number(d.totalLiquido),
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-1">Faturamento por Mês de Pagamento</h3>
      <p className="text-xs text-muted-foreground mb-4">Valor Bruto vs. Líquido (R$)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Bruto" fill={CIS_GREEN} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Líquido" fill={CIS_LIGHT_GREEN} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Gráfico donut: Status de pagamento
export function StatusPagamentoChart({ pago, emAberto }: { pago: number; emAberto: number }) {
  const total = pago + emAberto;
  const percPago = total > 0 ? Math.round((pago / total) * 100) : 0;
  const data = [
    { name: "Pago", value: pago },
    { name: "Em Aberto", value: emAberto },
  ];
  const COLORS = [CIS_GREEN, "#f59e0b"];

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-1">Status de Pagamento</h3>
      <p className="text-xs text-muted-foreground mb-2">Distribuição por valor líquido</p>
      <div className="flex items-center justify-center">
        <div className="relative">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground">{percPago}%</span>
            <span className="text-xs text-muted-foreground">Pago</span>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
            <span className="text-xs text-muted-foreground">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gráfico horizontal: Top 5 médicos
export function TopMedicosChart({ data }: { data: MedicoData[] }) {
  const chartData = data.map(d => ({
    name: d.medico.split(" ").slice(0, 2).join(" "),
    value: Number(d.totalBruto),
  })).reverse();

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-1">Top 5 Médicos — Valor Bruto</h3>
      <p className="text-xs text-muted-foreground mb-4">No período selecionado</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
          <XAxis type="number" tickFormatter={formatK} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
          <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor Bruto"]} />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Gráfico de barras: Resumo por unidade
export function ResumoUnidadeChart({ data }: { data: UnidadeData[] }) {
  const chartData = data.map(d => ({
    name: d.unidade,
    Bruto: Number(d.totalBruto),
    Líquido: Number(d.totalLiquido),
    Pago: Number(d.totalPago),
    "Em Aberto": Number(d.totalEmAberto),
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-1">Comparativo por Unidade</h3>
      <p className="text-xs text-muted-foreground mb-4">Bruto / Líquido / Pago / Em Aberto</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Bruto" fill={CIS_GREEN} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Líquido" fill={CIS_LIGHT_GREEN} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Pago" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Em Aberto" fill="#f59e0b" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
