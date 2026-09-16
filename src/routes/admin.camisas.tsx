import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, CheckCircle2, Clock } from "lucide-react";
import jsPDF from "jspdf";
import camisaLavoura from "@/assets/camisa-lavoura.png";

export const Route = createFileRoute("/admin/camisas")({
  head: () => ({ meta: [{ title: "Pedidos de camisa — Admin" }] }),
  component: AdminCamisas,
});

const PRECO_UNITARIO = 65;
const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG"] as const;

type Item = { tamanho: string; quantidade: number };
type Pedido = {
  id: string;
  status: "pendente" | "atendido";
  created_at: string;
  socios: { nome_completo: string } | null;
  unidades: { numero: string; nome: string | null } | null;
  camisa_pedido_itens: Item[];
};

function imageToDataUrl(src: string): Promise<string | null> {
  return fetch(src)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        }),
    )
    .catch(() => null);
}

function AdminCamisas() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("camisa_pedidos")
      .select(
        "id, status, created_at, socios(nome_completo), unidades(numero, nome), camisa_pedido_itens(tamanho, quantidade)",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPedidos((data as unknown as Pedido[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totaisPorTamanho = useMemo(() => {
    const totals: Record<string, number> = Object.fromEntries(TAMANHOS.map((t) => [t, 0]));
    for (const p of pedidos) {
      for (const i of p.camisa_pedido_itens) {
        totals[i.tamanho] = (totals[i.tamanho] ?? 0) + i.quantidade;
      }
    }
    return totals;
  }, [pedidos]);

  const totalGeral = Object.values(totaisPorTamanho).reduce((a, b) => a + b, 0);

  async function handleMarcarAtendido(id: string) {
    const { error } = await supabase.from("camisa_pedidos").update({ status: "atendido" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "atendido" } : p)));
  }

  async function handleExportarPDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 40;
    let y = 50;

    const ensureSpace = (need: number) => {
      if (y + need > pageH - 40) {
        doc.addPage();
        y = 50;
      }
    };

    const imgData = await imageToDataUrl(camisaLavoura);
    if (imgData) {
      try {
        doc.addImage(imgData, "PNG", pageW - marginX - 70, 40, 70, 70);
      } catch {
        // se a imagem falhar por algum motivo, segue o PDF sem ela
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Pedido de Camisas — Lavoura", marginX, y);
    y += 8;
    doc.setDrawColor(57, 79, 62);
    doc.setLineWidth(1);
    doc.line(marginX, y, pageW - marginX - 80, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginX, y);
    y += 8;
    doc.text(`Valor unitário: R$ ${PRECO_UNITARIO.toFixed(2).replace(".", ",")}`, marginX, y);
    y += 24;
    doc.setTextColor(0);

    // Totais por tamanho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(57, 79, 62);
    doc.text("Total consolidado por tamanho", marginX, y);
    y += 6;
    doc.setDrawColor(220);
    doc.line(marginX, y, pageW - marginX, y);
    y += 16;
    doc.setTextColor(0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    for (const t of TAMANHOS) {
      ensureSpace(18);
      const qtd = totaisPorTamanho[t] ?? 0;
      doc.text(t, marginX, y);
      doc.text(String(qtd), marginX + 60, y);
      doc.text(`R$ ${(qtd * PRECO_UNITARIO).toFixed(2).replace(".", ",")}`, marginX + 120, y);
      y += 16;
    }
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.text("Total geral", marginX, y);
    doc.text(String(totalGeral), marginX + 60, y);
    doc.text(`R$ ${(totalGeral * PRECO_UNITARIO).toFixed(2).replace(".", ",")}`, marginX + 120, y);
    y += 30;

    // Detalhe por pedido/unidade
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(57, 79, 62);
    ensureSpace(30);
    doc.text("Detalhamento por unidade", marginX, y);
    y += 6;
    doc.setDrawColor(220);
    doc.line(marginX, y, pageW - marginX, y);
    y += 16;
    doc.setTextColor(0);

    for (const p of pedidos) {
      ensureSpace(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const unidadeLabel = p.unidades ? `Unidade ${p.unidades.numero}${p.unidades.nome ? " — " + p.unidades.nome : ""}` : "Unidade —";
      doc.text(`${unidadeLabel} (${p.socios?.nome_completo ?? "—"})`, marginX, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const resumo = p.camisa_pedido_itens.map((i) => `${i.quantidade}× ${i.tamanho}`).join(", ");
      const dataStr = new Date(p.created_at).toLocaleDateString("pt-BR");
      const lines = doc.splitTextToSize(`${resumo} — ${dataStr} — ${p.status === "atendido" ? "Atendido" : "Pendente"}`, pageW - marginX * 2);
      doc.text(lines, marginX, y);
      y += lines.length * 13 + 10;
    }

    doc.save(`pedido-camisas-lavoura-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Pedidos de Camisa</h1>
        <Button onClick={handleExportarPDF} disabled={pedidos.length === 0}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <img
            src={camisaLavoura}
            alt="Camisa da Lavoura"
            className="h-32 w-32 shrink-0 rounded-lg border border-border object-cover"
          />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Camisa polo oficial Lavoura</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              R$ {PRECO_UNITARIO.toFixed(2).replace(".", ",")}
              <span className="text-sm font-normal text-muted-foreground"> / unidade</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {totalGeral} {totalGeral === 1 ? "camisa pedida" : "camisas pedidas"} no total — R${" "}
              {(totalGeral * PRECO_UNITARIO).toFixed(2).replace(".", ",")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total consolidado por tamanho</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {TAMANHOS.map((t) => (
              <div key={t} className="rounded-md border border-border p-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">{t}</p>
                <p className="text-xl font-semibold text-foreground">{totaisPorTamanho[t] ?? 0}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos por unidade</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido de camisa ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Sócio</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((p) => {
                  const qtd = p.camisa_pedido_itens.reduce((s, i) => s + i.quantidade, 0);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.unidades ? `${p.unidades.numero}${p.unidades.nome ? " — " + p.unidades.nome : ""}` : "—"}
                      </TableCell>
                      <TableCell>{p.socios?.nome_completo ?? "—"}</TableCell>
                      <TableCell>
                        {p.camisa_pedido_itens.map((i) => `${i.quantidade}× ${i.tamanho}`).join(", ")}
                      </TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>R$ {(qtd * PRECO_UNITARIO).toFixed(2).replace(".", ",")}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "atendido" ? "outline" : "secondary"}>
                          {p.status === "atendido" ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Atendido
                            </>
                          ) : (
                            <>
                              <Clock className="mr-1 h-3 w-3" /> Pendente
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.status !== "atendido" && (
                          <Button size="sm" variant="ghost" onClick={() => handleMarcarAtendido(p.id)}>
                            Marcar atendido
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
