import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { FileSpreadsheet, Calendar, Building2, Hash, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MESES = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Importacoes() {
  const { data: importacoes = [], isLoading } = trpc.plantoes.importacoes.useQuery();

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Histórico de Importações</h1>
            <p className="text-xs text-muted-foreground">Registro de todas as planilhas importadas no sistema</p>
          </div>
          <Badge variant="secondary" className="text-xs">{importacoes.length} importações</Badge>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : importacoes.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <FileSpreadsheet size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">Nenhuma importação realizada</p>
            <p className="text-xs text-muted-foreground mt-1">Importe uma planilha para começar a usar o dashboard.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Arquivo</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Unidade</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Mês Pagamento</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Mês Referência</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Registros</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Importado Por</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {importacoes.map((imp) => (
                  <tr key={imp.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={14} className="text-primary shrink-0" />
                        <span className="font-medium text-foreground max-w-[200px] truncate" title={imp.nomeArquivo}>
                          {imp.nomeArquivo}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs font-bold">{imp.unidade}</Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {MESES[imp.mesPagamento]}/{imp.anoPagamento}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {imp.mesReferencia?.toLowerCase() || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-foreground">{imp.totalRegistros}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{imp.importadoPor || "Sistema"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(imp.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
