import { createServerFn } from "@tanstack/react-start";

const MAX_BYTES = 10 * 1024 * 1024;

function safeSegment(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.replace(/[^A-Za-z0-9_-]/g, "").slice(0, max) : "";
  if (!s) throw new Error("Dados inválidos.");
  return s;
}

async function checkPdf(f: unknown): Promise<File> {
  if (!(f instanceof File)) throw new Error("Arquivo ausente.");
  if (f.size === 0 || f.size > MAX_BYTES) throw new Error("Arquivo inválido.");
  const head = new Uint8Array(await f.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...head) !== "%PDF-") throw new Error("Envie apenas PDF.");
  return f;
}

// Envio público dos documentos do cadastro: feito no servidor, com nomes gerados aqui.
export const uploadSocioDocs = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Dados inválidos.");
    return data;
  })
  .handler(async ({ data }) => {
    const numero = safeSegment(data.get("numero"), 20);
    const hint = typeof data.get("hint") === "string" ? String(data.get("hint")).replace(/\D/g, "").slice(0, 11) : "";
    const idFile = await checkPdf(data.get("identidade"));
    const cpfFile = await checkPdf(data.get("cpf"));
    const folder = `pending/${numero}/${Date.now()}-${hint || "socio"}-${crypto.randomUUID()}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const idPath = `${folder}/identidade.pdf`;
    const cpfPath = `${folder}/cpf.pdf`;
    for (const [path, file] of [[idPath, idFile], [cpfPath, cpfFile]] as const) {
      const { error } = await supabaseAdmin.storage
        .from("socio-documentos")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw new Error("Falha ao enviar documento.");
    }
    return { identidade: idPath, cpf: cpfPath };
  });
