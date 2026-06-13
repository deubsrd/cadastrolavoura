import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Unidade = {
  id: string;
  numero: string;
  nome: string | null;
  endereco: string | null;
  cnpj: string | null;
  ativo: boolean;
};

export type Socio = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  tipo: "administrador" | "cotista";
  unidade_id: string | null;
};

export function useFranqueado() {
  const [loading, setLoading] = useState(true);
  const [socio, setSocio] = useState<Socio | null>(null);
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: socioData, error: socioErr } = await supabase
      .from("socios")
      .select("id, nome_completo, email, telefone, tipo, unidade_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (socioErr) {
      setError(socioErr.message);
      setLoading(false);
      return;
    }

    setSocio(socioData as Socio | null);

    if (socioData?.unidade_id) {
      const { data: unidadeData, error: unidadeErr } = await supabase
        .from("unidades")
        .select("id, numero, nome, endereco, cnpj, ativo")
        .eq("id", socioData.unidade_id)
        .maybeSingle();

      if (unidadeErr) setError(unidadeErr.message);
      setUnidade(unidadeData as Unidade | null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, socio, unidade, unidadeId: socio?.unidade_id ?? null, error, reload: load };
}
