import { Users, CalendarDays, TrendingUp, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";

interface ResumoFinanceiro {
  totalBruto: number;
  totalLiquido: number;
  totalPago: number;
  totalEmAberto: number;
  totalMedicos: number;
  totalPlantoes: number;
}

function formatCurrency(value: number): string {
  // Exibe valor completo no formato brasileiro: R$ 391.768,30
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  borderColor?: string;
}

function StatCard({ icon, label, value, sub, color = "text-foreground", borderColor = "border-l-primary" }: CardProps) {
  return (
    <div className={`bg-card rounded-xl border border-border border-l-4 ${borderColor} p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-xl font-bold ${color} leading-tight`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="shrink-0 p-2 rounded-lg bg-muted/50">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface SummaryCardsProps {
  data: ResumoFinanceiro | null | undefined;
  loading?: boolean;
}

export default function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 h-24 animate-pulse">
            <div className="h-3 bg-muted rounded w-2/3 mb-3" />
            <div className="h-6 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const totalBruto = Number(data?.totalBruto || 0);
  const totalLiquido = Number(data?.totalLiquido || 0);
  const totalPago = Number(data?.totalPago || 0);
  const totalEmAberto = Number(data?.totalEmAberto || 0);
  const totalMedicos = Number(data?.totalMedicos || 0);
  // totalPlantoes agora é soma de horas / 12 (calculado no backend)
  const totalPlantoes = Math.round(Number(data?.totalPlantoes || 0));
  const retencoes = totalBruto - totalLiquido;
  const percPago = totalLiquido > 0 ? ((totalPago / totalLiquido) * 100).toFixed(0) : "0";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        icon={<Users size={18} className="text-primary" />}
        label="Médicos Ativos"
        value={totalMedicos}
        sub={`${totalPlantoes} plantões`}
        borderColor="border-l-primary"
      />
      <StatCard
        icon={<CalendarDays size={18} className="text-blue-500" />}
        label="Total Plantões"
        value={totalPlantoes}
        sub="soma de horas ÷ 12"
        color="text-blue-600"
        borderColor="border-l-blue-500"
      />
      <StatCard
        icon={<TrendingUp size={18} className="text-violet-500" />}
        label="Valor Bruto"
        value={formatCurrency(totalBruto)}
        sub="competência"
        color="text-violet-600"
        borderColor="border-l-violet-500"
      />
      <StatCard
        icon={<DollarSign size={18} className="text-primary" />}
        label="Valor Líquido"
        value={formatCurrency(totalLiquido)}
        sub={retencoes > 0 ? `-${formatCurrency(retencoes)} retenções` : "após retenções"}
        borderColor="border-l-primary"
      />
      <StatCard
        icon={<CheckCircle2 size={18} className="text-emerald-500" />}
        label="Valor Pago"
        value={formatCurrency(totalPago)}
        sub={`${percPago}% do total líquido`}
        color="text-emerald-600"
        borderColor="border-l-emerald-500"
      />
      <StatCard
        icon={<AlertCircle size={18} className="text-amber-500" />}
        label="Em Aberto"
        value={formatCurrency(totalEmAberto)}
        sub={totalEmAberto === 0 ? "Tudo pago" : "pendente"}
        color={totalEmAberto > 0 ? "text-amber-600" : "text-emerald-600"}
        borderColor={totalEmAberto > 0 ? "border-l-amber-500" : "border-l-emerald-500"}
      />
    </div>
  );
}
