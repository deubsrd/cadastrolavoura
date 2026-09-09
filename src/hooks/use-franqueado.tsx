import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Unidade = {
  id: string;
  numero: string;
  nome: string | null;
  endereco: string | null;
  cnpj: string | null;
  ativo: boolean;
  link_projeto_3d: string | null;
};

export type Socio = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  tipo: "administrador" | "cotista";
  unidade_id: string | null;
};

type FranqueadoState = {
  loading: boolean;
  socio: Socio | null;
  unidade: Unidade | null;
  unidadeId: string | null;
  error: string | null;
  reload: () => Promise<void>;
};

const FranqueadoContext = createContext<FranqueadoState | null>(null);

// Busca socio + unidade UMA vez por sessão de navegação e compartilha o
// resultado via contexto — antes, o layout /app e cada página chamavam essa
// query separadamente, duplicando as consultas a `socios` e `unidades` em
// toda troca de tela.
export function FranqueadoProvider({ children }: { children: ReactNode }) {
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
        .select("id, numero, nome, endereco, cnpj, ativo, link_projeto_3d")
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

  const value: FranqueadoState = {
    loading,
    socio,
    unidade,
    unidadeId: socio?.unidade_id ?? null,
    error,
    reload: load,
  };

  return <FranqueadoContext.Provider value={value}>{children}</FranqueadoContext.Provider>;
}

export function useFranqueado(): FranqueadoState {
  const ctx = useContext(FranqueadoContext);
  if (!ctx) {
    throw new Error("useFranqueado precisa estar dentro de um FranqueadoProvider (layout /app)");
  }
  return ctx;
}
