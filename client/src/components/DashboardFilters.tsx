import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" }, { value: 4, label: "Abril" },
  { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

export interface FilterState {
  unidade: string[];
  mesPagamento: number[];
  anoPagamento: number[];
  especialidade: string[];
  tipoPlantao: string[];
}

export function emptyFilter(): FilterState {
  return { unidade: [], mesPagamento: [], anoPagamento: [], especialidade: [], tipoPlantao: [] };
}

interface MultiSelectProps<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (v: T[]) => void;
  placeholder?: string;
  minWidth?: string;
}

function MultiSelect<T extends string | number>({
  label, options, selected, onChange, placeholder = "Todos", minWidth = "140px",
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: T) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const displayLabel = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label ?? String(selected[0])
      : `${selected.length} selecionados`;

  return (
    <div className="flex items-center gap-1.5" ref={ref}>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</span>
      <div className="relative" style={{ minWidth }}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            "flex items-center justify-between gap-1 h-8 px-3 rounded-md border text-xs bg-card w-full transition-colors",
            open ? "border-primary ring-1 ring-primary/30" : "border-input hover:border-primary/50",
            selected.length > 0 ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <div className="flex items-center gap-0.5 shrink-0">
            {selected.length > 0 && (
              <span onClick={clearAll} className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors">
                <X size={11} />
              </span>
            )}
            <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
          </div>
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-full max-h-56 overflow-y-auto">
            {options.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma opção disponível</div>
            )}
            {options.map(opt => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors",
                    isSelected && "text-primary font-medium"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center w-3.5 h-3.5 rounded border shrink-0 transition-colors",
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                  )}>
                    {isSelected && <Check size={9} strokeWidth={3} />}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface DashboardFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  const { data: unidades = [] } = trpc.plantoes.unidades.useQuery();
  const { data: periodos = [] } = trpc.plantoes.periodos.useQuery();
  const { data: especialidades = [] } = trpc.plantoes.especialidades.useQuery({
    unidade: filters.unidade.length === 1 ? filters.unidade[0] : undefined,
  });
  const { data: tiposPlantao = [] } = trpc.plantoes.tiposPlantao.useQuery({
    unidade: filters.unidade.length === 1 ? filters.unidade[0] : undefined,
  });

  const anos = Array.from(new Set(periodos.map(p => p.anoPagamento))).sort((a, b) => b - a);

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const hasAnyFilter = Object.values(filters).some(v => Array.isArray(v) && v.length > 0);

  const clearAll = () => onChange(emptyFilter());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelect
        label="Unidade"
        options={unidades.map(u => ({ value: u, label: u }))}
        selected={filters.unidade}
        onChange={v => update("unidade", v)}
        placeholder="Todas"
        minWidth="130px"
      />
      <MultiSelect
        label="Mês de Pagamento"
        options={MESES}
        selected={filters.mesPagamento}
        onChange={v => update("mesPagamento", v)}
        placeholder="Todos"
        minWidth="130px"
      />
      <MultiSelect
        label="Ano"
        options={anos.map(a => ({ value: a, label: String(a) }))}
        selected={filters.anoPagamento}
        onChange={v => update("anoPagamento", v)}
        placeholder="Todos"
        minWidth="90px"
      />
      <MultiSelect
        label="Especialidade"
        options={especialidades.filter(Boolean).map(e => ({ value: e!, label: e! }))}
        selected={filters.especialidade}
        onChange={v => update("especialidade", v)}
        placeholder="Todas"
        minWidth="150px"
      />
      <MultiSelect
        label="Plantão"
        options={tiposPlantao.filter(Boolean).map(t => ({ value: t!, label: t! }))}
        selected={filters.tipoPlantao}
        onChange={v => update("tipoPlantao", v)}
        placeholder="Todos"
        minWidth="140px"
      />
      {hasAnyFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 h-8 px-2.5 rounded-md border border-destructive/30 text-xs text-destructive hover:bg-destructive/5 transition-colors"
        >
          <X size={12} />Limpar filtros
        </button>
      )}
    </div>
  );
}
