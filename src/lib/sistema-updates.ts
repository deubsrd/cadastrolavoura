export type SistemaUpdate = {
  id: string;
  /** ISO 8601 — usado para comparar com a última visita do franqueado. */
  publicadoEm: string;
  titulo: string;
  descricao: string;
};

/**
 * Novidades do sistema mostradas ao franqueado em /app.
 * Adicione uma entrada no topo sempre que lançar algo que o franqueado
 * precise saber. `publicadoEm` decide o que aparece como "não visto".
 */
export const SISTEMA_UPDATES: SistemaUpdate[] = [
  {
    id: "2026-08-31-manual-operacao",
    publicadoEm: "2026-08-31T00:00:00Z",
    titulo: "Manual de Operação disponível",
    descricao:
      "Agora você pode baixar o Manual de Operação completo direto na Central de Suporte, na aba de Treinamento.",
  },
];

export function getUpdatesNaoVistas(ultimaVistaEm: string | null): SistemaUpdate[] {
  if (!ultimaVistaEm) return SISTEMA_UPDATES;
  const cutoff = new Date(ultimaVistaEm).getTime();
  return SISTEMA_UPDATES.filter((u) => new Date(u.publicadoEm).getTime() > cutoff);
}
