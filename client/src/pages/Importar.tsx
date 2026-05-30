import { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, AlertTriangle,
  ChevronDown, ChevronUp, Eye, Users, BarChart2, ArrowRight, Ban,
} from "lucide-react";
import { toast } from "sonner";

interface ParseError { aba: string; motivo: string; detalhes?: string; }
interface ParseWarning { aba: string; linha: number; campo: string; valorOriginal: string; mensagem: string; }
interface PreviewAba {
  unidade: string; unidadeNome?: string; mesPagamento: number; anoPagamento: number;
  totalRegistros: number; medicos: string[]; concluidos: number; pendentes: number;
  avisos: number; detalhesAvisos: ParseWarning[];
}
interface PreviewResponse {
  success: boolean; abas: PreviewAba[]; erros: ParseError[];
  totalRegistros: number; totalAbas: number; error?: string; detalhes?: string;
}
interface ImportResult { unidade: string; unidadeNome?: string; mesPagamento: number; anoPagamento: number; totalRegistros: number; avisos?: number; }
interface ImportResponse { success: boolean; resultados?: ImportResult[]; erros?: ParseError[]; avisos?: ParseWarning[]; error?: string; detalhes?: string; }

const MESES = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function ErrorLog({ erros, avisos }: { erros: ParseError[]; avisos: ParseWarning[] }) {
  const [showAvisos, setShowAvisos] = useState(false);
  if (!erros.length && !avisos.length) return null;
  return (
    <div className="space-y-3">
      {erros.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-100 border-b border-red-200">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <p className="text-sm font-semibold text-red-800">{erros.length} erro{erros.length > 1 ? "s" : ""} encontrado{erros.length > 1 ? "s" : ""}</p>
          </div>
          <div className="divide-y divide-red-100">
            {erros.map((e, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded shrink-0 mt-0.5">Aba: {e.aba}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-700">{e.motivo}</p>
                    {e.detalhes && <p className="text-xs text-red-600 mt-1 leading-relaxed">{e.detalhes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {avisos.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <button onClick={() => setShowAvisos(v => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-amber-100 border-b border-amber-200 hover:bg-amber-200 transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <p className="text-sm font-semibold text-amber-800">{avisos.length} aviso{avisos.length > 1 ? "s" : ""} de inconsistência</p>
            </div>
            {showAvisos ? <ChevronUp size={14} className="text-amber-600" /> : <ChevronDown size={14} className="text-amber-600" />}
          </button>
          {showAvisos && (
            <div className="divide-y divide-amber-100 max-h-64 overflow-y-auto">
              {avisos.map((w, i) => (
                <div key={i} className="px-4 py-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-700 shrink-0">Linha {w.linha}</span>
                    <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">{w.campo}</span>
                    <span className="text-amber-700 flex-1">{w.mensagem}</span>
                  </div>
                  {w.valorOriginal && <p className="mt-1 text-amber-500 font-mono text-[10px] truncate">Valor: "{w.valorOriginal}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewAbaCard({ aba }: { aba: PreviewAba }) {
  const [showMedicos, setShowMedicos] = useState(false);
  const [showAvisos, setShowAvisos] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{aba.unidade}</span>
          {aba.unidadeNome && aba.unidadeNome !== aba.unidade && <span className="text-xs text-muted-foreground">{aba.unidadeNome}</span>}
          <span className="text-xs text-muted-foreground">—</span>
          <span className="text-xs font-semibold text-foreground">{MESES[aba.mesPagamento]}/{aba.anoPagamento}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{aba.totalRegistros} registros</span>
          {aba.avisos > 0 && <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{aba.avisos} aviso{aba.avisos > 1 ? "s" : ""}</span>}
        </div>
      </div>
      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground shrink-0" />
          <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Médicos</p><p className="text-sm font-bold text-foreground">{aba.medicos.length}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-emerald-500 shrink-0" />
          <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Concluídos</p><p className="text-sm font-bold text-emerald-600">{aba.concluidos}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-amber-500 shrink-0" />
          <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pendentes</p><p className="text-sm font-bold text-amber-600">{aba.pendentes}</p></div>
        </div>
      </div>
      {aba.medicos.length > 0 && (
        <div className="border-b border-border">
          <button onClick={() => setShowMedicos(v => !v)} className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors text-left">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Médicos identificados ({aba.medicos.length})</span>
            {showMedicos ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
          </button>
          {showMedicos && (
            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto">
              {aba.medicos.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span className="truncate">{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {aba.avisos > 0 && (
        <div>
          <button onClick={() => setShowAvisos(v => !v)} className="w-full flex items-center justify-between px-4 py-2 hover:bg-amber-50 transition-colors text-left">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">{aba.avisos} aviso{aba.avisos > 1 ? "s" : ""} de inconsistência</span>
            {showAvisos ? <ChevronUp size={13} className="text-amber-500" /> : <ChevronDown size={13} className="text-amber-500" />}
          </button>
          {showAvisos && (
            <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
              {aba.detalhesAvisos.map((w, i) => (
                <div key={i} className="text-xs text-amber-700 bg-amber-50 rounded p-2">
                  <span className="font-bold">Linha {w.linha}</span> · {w.campo}: {w.mensagem}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Step = "select" | "preview" | "importing" | "done";

export default function Importar() {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [previewErrors, setPreviewErrors] = useState<ParseError[]>([]);
  const [previewCritical, setPreviewCritical] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [parseAvisos, setParseAvisos] = useState<ParseWarning[]>([]);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setFiles([]); setStep("select"); setPreviewData(null); setPreviewErrors([]);
    setPreviewCritical(null); setResults(null); setParseErrors([]); setParseAvisos([]); setCriticalError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".xlsx") || f.name.endsWith(".xls"));
    if (dropped.length === 0) { toast.error("Apenas arquivos .xlsx ou .xls são aceitos."); return; }
    setFiles(prev => [...prev, ...dropped]); setStep("select");
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(f => f.name.endsWith(".xlsx") || f.name.endsWith(".xls"));
    setFiles(prev => [...prev, ...selected]); setStep("select");
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handlePreview = async () => {
    if (files.length === 0) return;
    setPreviewing(true); setPreviewData(null); setPreviewErrors([]); setPreviewCritical(null);
    const allAbas: PreviewAba[] = []; const allErros: ParseError[] = []; let totalRegistros = 0;
    for (const file of files) {
      const formData = new FormData(); formData.append("file", file);
      try {
        const res = await fetch("/api/preview-plantoes", { method: "POST", body: formData });
        const data: PreviewResponse = await res.json();
        if (!res.ok) {
          if (data.erros?.length) allErros.push(...data.erros.map(e => ({ ...e, aba: `${file.name} — ${e.aba}` })));
          else { setPreviewCritical(`Erro ao analisar "${file.name}": ${data.detalhes || data.error || "Erro desconhecido"}`); setPreviewing(false); return; }
          continue;
        }
        if (data.abas) allAbas.push(...data.abas);
        if (data.erros) allErros.push(...data.erros);
        totalRegistros += data.totalRegistros || 0;
      } catch (err: any) { setPreviewCritical(`Erro ao analisar "${file.name}": ${err.message}`); setPreviewing(false); return; }
    }
    setPreviewData({ success: true, abas: allAbas, erros: allErros, totalRegistros, totalAbas: allAbas.length });
    setPreviewErrors(allErros); setPreviewing(false); setStep("preview");
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setStep("importing");
    const allResults: ImportResult[] = []; const allErrors: ParseError[] = []; const allAvisos: ParseWarning[] = [];
    for (const file of files) {
      const formData = new FormData(); formData.append("file", file);
      try {
        const res = await fetch("/api/upload-plantoes", { method: "POST", body: formData });
        const data: ImportResponse = await res.json();
        if (!res.ok) {
          if (data.erros?.length) allErrors.push(...data.erros.map(e => ({ ...e, aba: `${file.name} — ${e.aba}` })));
          else { setCriticalError(`Erro ao importar "${file.name}": ${data.detalhes || data.error || "Erro desconhecido"}`); setStep("done"); return; }
          continue;
        }
        if (data.resultados) allResults.push(...data.resultados);
        if (data.erros) allErrors.push(...data.erros);
        if (data.avisos) allAvisos.push(...data.avisos);
      } catch (err: any) { setCriticalError(`Erro ao importar "${file.name}": ${err.message}`); setStep("done"); return; }
    }
    setResults(allResults.length > 0 ? allResults : null);
    setParseErrors(allErrors); setParseAvisos(allAvisos); setStep("done");
    if (allResults.length > 0) toast.success(`${allResults.length} aba(s) importada(s) com sucesso!`);
    if (allErrors.length > 0) toast.warning(`${allErrors.length} erro(s) encontrado(s) — verifique o log abaixo.`);
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-lg font-bold text-foreground">Importar Planilha de Plantões</h1>
          <p className="text-xs text-muted-foreground">Suporta arquivos .xlsx com múltiplas abas — substitui dados do mesmo mês/unidade</p>
        </div>

        {/* Selecionar + Preview */}
        {(step === "select" || step === "preview") && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
            >
              <div className={`p-4 rounded-full transition-colors ${dragging ? "bg-primary/10" : "bg-muted"}`}>
                <Upload size={28} className={dragging ? "text-primary" : "text-muted-foreground"} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Arraste os arquivos aqui ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">Arquivos .xlsx ou .xls — máximo 10MB por arquivo</p>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={handleFileInput} />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{files.length} arquivo(s) selecionado(s)</p>
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                    <FileSpreadsheet size={18} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground hover:text-destructive transition-colors"><X size={16} /></button>
                  </div>
                ))}
                {step === "select" && (
                  <Button onClick={handlePreview} disabled={previewing} className="w-full mt-2 gap-2" variant="outline">
                    {previewing ? (<><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />Analisando...</>) : (<><Eye size={16} />Analisar Planilha{files.length > 1 ? "s" : ""}</>)}
                  </Button>
                )}
              </div>
            )}

            {previewCritical && (
              <div className="flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div><p className="text-sm font-semibold text-red-700">Erro ao analisar planilha</p><p className="text-xs text-red-600 mt-1 whitespace-pre-wrap">{previewCritical}</p></div>
              </div>
            )}

            {step === "preview" && previewData && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
                  <Eye size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">
                      Prévia da importação — {previewData.totalAbas} aba{previewData.totalAbas > 1 ? "s" : ""} · {previewData.totalRegistros} registros no total
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">Revise os dados abaixo antes de confirmar. Nenhuma informação foi salva ainda.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {previewData.abas.map((aba, i) => <PreviewAbaCard key={i} aba={aba} />)}
                </div>
                {previewErrors.length > 0 && <ErrorLog erros={previewErrors} avisos={[]} />}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={resetAll}>
                    <Ban size={16} />Cancelar Importação
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleImport} disabled={previewData.abas.length === 0}>
                    <ArrowRight size={16} />Confirmar e Importar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Importando */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-semibold text-foreground">Importando dados...</p>
            <p className="text-xs text-muted-foreground">Aguarde, os dados estão sendo salvos no sistema.</p>
          </div>
        )}

        {/* Concluído */}
        {step === "done" && (
          <div className="space-y-4">
            {results && results.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-100 border-b border-emerald-200">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-800">{results.length} aba{results.length > 1 ? "s" : ""} importada{results.length > 1 ? "s" : ""} com sucesso!</p>
                </div>
                <div className="divide-y divide-emerald-100">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">{r.unidade}</span>
                        {r.unidadeNome && r.unidadeNome !== r.unidade && <span className="text-xs text-muted-foreground">{r.unidadeNome}</span>}
                        <span className="text-xs text-muted-foreground">—</span>
                        <span className="text-xs text-muted-foreground">{MESES[r.mesPagamento]}/{r.anoPagamento}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{r.totalRegistros} registros</span>
                        {r.avisos && r.avisos > 0 && <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{r.avisos} aviso{r.avisos > 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100">
                  <p className="text-xs text-emerald-600">Os dados já estão disponíveis no dashboard.</p>
                </div>
              </div>
            )}
            <ErrorLog erros={parseErrors} avisos={parseAvisos} />
            {criticalError && (
              <div className="flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div><p className="text-sm font-semibold text-red-700">Erro crítico na importação</p><p className="text-xs text-red-600 mt-1 whitespace-pre-wrap">{criticalError}</p></div>
              </div>
            )}
            <Button variant="outline" className="w-full gap-2" onClick={resetAll}>
              <Upload size={16} />Nova Importação
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
