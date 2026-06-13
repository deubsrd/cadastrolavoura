import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Eye,
  Trash2,
  Upload,
  History,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type DocTipo = "cof" | "pre_contrato" | "contrato" | "outros";

type Documento = {
  id: string;
  unidade_id: string;
  tipo: DocTipo;
  nome: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  data_vencimento: string | null;
  arquivado: boolean;
  versao: number;
  substituido_por: string | null;
  created_at: string;
};

const TIPO_LABEL: Record<DocTipo, string> = {
  cof: "COF (Circular de Oferta de Franquia)",
  pre_contrato: "Pré-contrato",
  contrato: "Contrato",
  outros: "Outros",
};

const TIPO_ORDER: DocTipo[] = ["cof", "pre_contrato", "contrato", "outros"];
const ACCEPT =
  "application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";
const MAX_MB = 20;

function formatDateBR(value: string | null | undefined): string {
  if (!value) return "—";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return value;
}

function vencimentoStatus(data: string | null): {
  variant: "default" | "secondary" | "destructive";
  label: string;
  className?: string;
} | null {
  if (!data) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const m = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const due = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { variant: "destructive", label: `Vencido ${formatDateBR(data)}` };
  if (diff <= 30)
    return {
      variant: "default",
      label: `Vence em ${diff}d (${formatDateBR(data)})`,
      className: "bg-yellow-500 text-yellow-950 hover:bg-yellow-500",
    };
  return { variant: "secondary", label: `Vence ${formatDateBR(data)}` };
}

export function UnidadeDocumentos({ unidadeId }: { unidadeId: string }) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<DocTipo>("cof");
  const [nomeCustom, setNomeCustom] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [substituirId, setSubstituirId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("unidade_documentos")
      .select("*")
      .eq("unidade_id", unidadeId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(`Falha ao carregar documentos: ${error.message}`);
    setDocs((data ?? []) as Documento[]);
  };

  useEffect(() => {
    if (unidadeId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  const ativos = docs.filter((d) => !d.arquivado);
  const arquivadosByAtivo = (ativoId: string) =>
    docs.filter((d) => d.arquivado && rastreiaSubstituicao(d, ativoId));

  // walk forward through substituido_por to see if eventually reaches ativoId
  function rastreiaSubstituicao(arquivado: Documento, ativoId: string): boolean {
    const map = new Map(docs.map((d) => [d.id, d]));
    let cur: Documento | undefined = arquivado;
    const seen = new Set<string>();
    while (cur?.substituido_por && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (cur.substituido_por === ativoId) return true;
      cur = map.get(cur.substituido_por);
    }
    return false;
  }

  const handleFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!file) return toast.error("Selecione um arquivo.");
    if (tipo === "outros" && !nomeCustom.trim()) return toast.error("Informe o nome do documento.");

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${unidadeId}/${tipo}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("unidade-documentos")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) {
        toast.error(`Falha no upload: ${upErr.message}`);
        setUploading(false);
        return;
      }

      let novaVersao = 1;
      if (substituirId) {
        const anterior = docs.find((d) => d.id === substituirId);
        if (anterior) novaVersao = anterior.versao + 1;
      }

      const nomeFinal = tipo === "outros" ? nomeCustom.trim() : file.name;

      const { data: inserted, error: insErr } = await supabase
        .from("unidade_documentos")
        .insert({
          unidade_id: unidadeId,
          tipo,
          nome: nomeFinal,
          storage_path: path,
          mime_type: file.type || null,
          tamanho_bytes: file.size,
          data_vencimento: vencimento || null,
          versao: novaVersao,
        })
        .select("*")
        .single();

      if (insErr || !inserted) {
        await supabase.storage.from("unidade-documentos").remove([path]);
        toast.error(`Falha ao salvar: ${insErr?.message}`);
        setUploading(false);
        return;
      }

      if (substituirId) {
        const { error: archErr } = await supabase
          .from("unidade_documentos")
          .update({ arquivado: true, substituido_por: inserted.id })
          .eq("id", substituirId);
        if (archErr)
          toast.error(`Documento enviado, mas falha ao arquivar anterior: ${archErr.message}`);
      }

      toast.success(substituirId ? "Documento substituído." : "Documento enviado.");
      setFile(null);
      setNomeCustom("");
      setVencimento("");
      setSubstituirId("");
      if (inputRef.current) inputRef.current.value = "";
      load();
    } finally {
      setUploading(false);
    }
  };

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("unidade-documentos")
      .createSignedUrl(path, 60 * 5);
    if (error || !data) {
      toast.error(`Falha ao gerar link: ${error?.message}`);
      return null;
    }
    return data.signedUrl;
  };

  const view = async (d: Documento) => {
    const url = await getSignedUrl(d.storage_path);
    if (url) window.open(url, "_blank");
  };

  const download = async (d: Documento) => {
    const url = await getSignedUrl(d.storage_path);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = d.nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const remove = async (d: Documento) => {
    if (!confirm(`Excluir "${d.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error: stErr } = await supabase.storage
      .from("unidade-documentos")
      .remove([d.storage_path]);
    if (stErr) toast.error(`Falha ao excluir arquivo: ${stErr.message}`);
    const { error } = await supabase.from("unidade_documentos").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Documento excluído.");
    load();
  };

  const toggleHist = (id: string) => setHistoricoOpen((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Enviar novo documento</h3>
        <form onSubmit={upload} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as DocTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "outros" && (
            <div className="space-y-1">
              <Label>Nome do documento</Label>
              <Input
                value={nomeCustom}
                onChange={(e) => setNomeCustom(e.target.value)}
                placeholder="Ex: Termo de adesão"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Validade (opcional)</Label>
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Substituir documento existente (opcional)</Label>
            <Select
              value={substituirId || "none"}
              onValueChange={(v) => setSubstituirId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (novo documento)</SelectItem>
                {ativos
                  .filter((d) => d.tipo === tipo)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      v{d.versao} — {d.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Arquivo (PDF, DOCX ou imagem · até {MAX_MB}MB)</Label>
            <Input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={uploading}>
              {substituirId ? (
                <RefreshCw className="mr-2 h-4 w-4" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Enviando..." : substituirId ? "Substituir" : "Enviar documento"}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Documentos ativos</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : ativos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
        ) : (
          TIPO_ORDER.map((t) => {
            const grupo = ativos.filter((d) => d.tipo === t);
            if (grupo.length === 0) return null;
            return (
              <div key={t} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {TIPO_LABEL[t]}
                </p>
                {grupo.map((d) => {
                  const status = vencimentoStatus(d.data_vencimento);
                  const historico = arquivadosByAtivo(d.id);
                  const aberto = historicoOpen[d.id];
                  return (
                    <div key={d.id} className="rounded-lg border bg-card p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">{d.nome}</span>
                            <Badge variant="outline" className="text-xs">
                              v{d.versao}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Enviado em {formatDateBR(d.created_at)}</span>
                            {d.tamanho_bytes && (
                              <span>· {(d.tamanho_bytes / 1024).toFixed(0)} KB</span>
                            )}
                            {status && (
                              <Badge variant={status.variant} className={status.className}>
                                {status.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => view(d)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => download(d)}
                            title="Baixar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(d)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {historico.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                          <button
                            type="button"
                            onClick={() => toggleHist(d.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {aberto ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <History className="h-3 w-3" />
                            Histórico de versões ({historico.length})
                          </button>
                          {aberto && (
                            <div className="mt-2 space-y-1.5 pl-4">
                              {historico.map((h) => (
                                <div
                                  key={h.id}
                                  className="flex items-center justify-between gap-2 rounded border bg-muted/30 px-2 py-1.5"
                                >
                                  <div className="min-w-0 text-xs">
                                    <span className="font-medium">v{h.versao}</span>
                                    <span className="ml-2 truncate text-muted-foreground">
                                      {h.nome} · {formatDateBR(h.created_at)}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => view(h)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => download(h)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => remove(h)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
