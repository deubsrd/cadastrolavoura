import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import lavouraLogo from "@/assets/lavoura-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SocioFields, type SocioData, emptySocio } from "@/components/forms/SocioFields";
import { SocioDocuments, type SocioDocs, emptyDocs } from "@/components/forms/SocioDocuments";
import { isValidCPF, isValidEmail, isValidPhone } from "@/lib/masks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cadastro de Franqueados — \n" },
      { name: "description", content: "Preencha o cadastro da sua unidade \n." },
    ],
  }),
  component: PublicForm,
});

function validateSocio(s: SocioData): Partial<Record<keyof SocioData, string>> {
  const e: Partial<Record<keyof SocioData, string>> = {};
  if (!s.nome_completo.trim()) e.nome_completo = "Obrigatório";
  if (!isValidEmail(s.email)) e.email = "Email inválido";
  if (!isValidPhone(s.telefone)) e.telefone = "Telefone inválido";
  if (!s.data_nascimento) e.data_nascimento = "Obrigatório";
  if (!isValidCPF(s.cpf)) e.cpf = "CPF inválido";
  if (!s.rg.trim()) e.rg = "Obrigatório";
  if (!s.rg_orgao.trim()) e.rg_orgao = "Obrigatório";
  if (!s.logradouro.trim()) e.logradouro = "Obrigatório";
  if (!s.numero_casa.trim()) e.numero_casa = "Obrigatório";
  if (!s.bairro.trim()) e.bairro = "Obrigatório";
  if (!s.cidade.trim()) e.cidade = "Obrigatório";
  if (!s.uf) e.uf = "Obrigatório";
  if (s.cep.replace(/\D/g, "").length !== 8) e.cep = "CEP inválido";
  if (!s.nacionalidade.trim()) e.nacionalidade = "Obrigatório";
  if (!s.estado_civil) e.estado_civil = "Obrigatório";
  return e;
}

function PublicForm() {
  const navigate = useNavigate();
  const [numeroUnidade, setNumeroUnidade] = useState<string>("");
  const [socios, setSocios] = useState<SocioData[]>([emptySocio()]);
  const [errs, setErrs] = useState<Array<Partial<Record<keyof SocioData, string>>>>([{}]);
  const [docs, setDocs] = useState<SocioDocs[]>([emptyDocs()]);
  const [docErrs, setDocErrs] = useState<Array<{ identidadeFile?: string; cpfFile?: string }>>([{}]);
  const [submitting, setSubmitting] = useState(false);

  const addSocio = () => {
    setSocios((p) => [...p, emptySocio()]);
    setErrs((p) => [...p, {}]);
    setDocs((p) => [...p, emptyDocs()]);
    setDocErrs((p) => [...p, {}]);
  };
  const removeSocio = (i: number) => {
    setSocios((p) => p.filter((_, idx) => idx !== i));
    setErrs((p) => p.filter((_, idx) => idx !== i));
    setDocs((p) => p.filter((_, idx) => idx !== i));
    setDocErrs((p) => p.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numero = numeroUnidade.trim();
    if (!numero) {
      toast.error("Informe o número da unidade.");
      return;
    }
    const newErrs = socios.map(validateSocio);
    setErrs(newErrs);
    const newDocErrs = docs.map((d) => {
      const e: { identidadeFile?: string; cpfFile?: string } = {};
      if (!d.identidadeFile) e.identidadeFile = "Envie o PDF do RG ou CNH";
      if (!d.cpfFile) e.cpfFile = "Envie o PDF do CPF";
      return e;
    });
    setDocErrs(newDocErrs);
    if (
      newErrs.some((x) => Object.keys(x).length > 0) ||
      newDocErrs.some((x) => Object.keys(x).length > 0)
    ) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSubmitting(true);

    // Upload dos PDFs antes de inserir
    const ts = Date.now();
    const uploadedPaths: Array<{ identidade: string; cpf: string }> = [];
    try {
      for (let i = 0; i < socios.length; i++) {
        const cpfDigits = socios[i].cpf.replace(/\D/g, "");
        const folder = `${numero}/${ts}-${cpfDigits || `socio${i + 1}`}`;
        const idFile = docs[i].identidadeFile!;
        const cpfFile = docs[i].cpfFile!;
        const idPath = `${folder}/identidade.pdf`;
        const cpfPath = `${folder}/cpf.pdf`;
        const up1 = await supabase.storage
          .from("socio-documentos")
          .upload(idPath, idFile, { contentType: "application/pdf", upsert: false });
        if (up1.error) throw up1.error;
        const up2 = await supabase.storage
          .from("socio-documentos")
          .upload(cpfPath, cpfFile, { contentType: "application/pdf", upsert: false });
        if (up2.error) throw up2.error;
        uploadedPaths.push({ identidade: idPath, cpf: cpfPath });
      }
    } catch (err) {
      setSubmitting(false);
      toast.error("Erro ao enviar os documentos. Tente novamente.");
      return;
    }

    const payload = socios.map((s, i) => ({
      unidade_id: null,
      numero_unidade: numero,
      ...s,
      documento_identidade_path: uploadedPaths[i].identidade,
      documento_cpf_path: uploadedPaths[i].cpf,
    }));
    const { error } = await supabase.from("socios").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar cadastro. Tente novamente.");
      return;
    }
    toast.success("Cadastro enviado com sucesso!");
    navigate({ to: "/obrigado" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center">
            <img src={lavouraLogo} alt="Lavoura — Lavanderia de autosserviço" className="h-12 w-auto" />
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
            Acesso administrativo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Cadastro de Franqueados
          </h1>
          <p className="mt-2 text-muted-foreground">
            Preencha os dados de cada sócio da unidade. Todos os campos são obrigatórios.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <Card style={{ boxShadow: "var(--shadow-card)" }}>
            <CardHeader>
              <CardTitle className="text-base">Unidade {"\n"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="unidade" className="text-sm">Número da unidade</Label>
              <Input
                id="unidade"
                className="mt-1.5"
                value={numeroUnidade}
                onChange={(e) => setNumeroUnidade(e.target.value)}
                placeholder="Ex.: 001"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Informe o número da sua unidade conforme indicado pela franqueadora.
              </p>
            </CardContent>
          </Card>

          {socios.map((socio, i) => (
            <Card key={i} style={{ boxShadow: "var(--shadow-card)" }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Sócio {i + 1}
                </CardTitle>
                {socios.length > 1 && (
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => removeSocio(i)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="mr-1 h-4 w-4" /> Remover
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <SocioFields value={socio}
                  onChange={(v) => setSocios((p) => p.map((s, idx) => idx === i ? v : s))}
                  errors={errs[i]} />
                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="mb-1 text-sm font-semibold text-primary">Documentos (PDF)</h3>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Anexe os documentos deste sócio. Ambos os arquivos são obrigatórios.
                  </p>
                  <SocioDocuments
                    value={docs[i] ?? emptyDocs()}
                    onChange={(v) => setDocs((p) => p.map((d, idx) => (idx === i ? v : d)))}
                    errors={docErrs[i]}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={addSocio}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar outro sócio
            </Button>
            <Button type="submit" disabled={submitting}
              style={{ background: "var(--gradient-accent)" }}
              className="text-accent-foreground hover:opacity-90">
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Enviando..." : "Enviar cadastro"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
