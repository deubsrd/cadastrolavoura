import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SocioAppState = {
  tourCompleto: boolean;
  ultimaAtualizacaoVistaEm: string | null;
};

const DEFAULT_STATE: SocioAppState = { tourCompleto: false, ultimaAtualizacaoVistaEm: null };

export function useSocioAppState(socioId: string | null) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<SocioAppState>(DEFAULT_STATE);

  const load = useCallback(async () => {
    if (!socioId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("socio_app_state")
      .select("tour_completo, ultima_atualizacao_vista_em")
      .eq("socio_id", socioId)
      .maybeSingle();

    setState(
      data
        ? {
            tourCompleto: data.tour_completo,
            ultimaAtualizacaoVistaEm: data.ultima_atualizacao_vista_em,
          }
        : DEFAULT_STATE,
    );
    setLoading(false);
  }, [socioId]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (patch: Partial<{ tour_completo: boolean; ultima_atualizacao_vista_em: string }>) => {
      if (!socioId) return;
      await supabase.from("socio_app_state").upsert({ socio_id: socioId, ...patch });
    },
    [socioId],
  );

  const markTourCompleto = useCallback(async () => {
    // O tour já mostra as áreas do sistema, então também marca as novidades
    // atuais como vistas — evita repetir o mesmo aviso logo em seguida.
    const now = new Date().toISOString();
    setState({ tourCompleto: true, ultimaAtualizacaoVistaEm: now });
    await persist({ tour_completo: true, ultima_atualizacao_vista_em: now });
  }, [persist]);

  const markAtualizacoesVistas = useCallback(async () => {
    const now = new Date().toISOString();
    setState((s) => ({ ...s, ultimaAtualizacaoVistaEm: now }));
    await persist({ ultima_atualizacao_vista_em: now });
  }, [persist]);

  return { loading, ...state, markTourCompleto, markAtualizacoesVistas };
}
