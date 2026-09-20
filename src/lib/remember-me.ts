// "Lembrar de mim": o Supabase já persiste a sessão em localStorage por
// padrão (client.ts é gerado automaticamente e não deve ser editado à mão
// pra trocar isso). Em vez de mexer no storage do client, guardamos a
// preferência à parte: se a pessoa desmarcar "lembrar de mim", deslogamos
// automaticamente na próxima vez que o navegador for aberto do zero
// (sessionStorage — ao contrário de localStorage — não sobrevive ao
// fechamento do navegador, então usamos isso como sinal de "sessão nova").
import { supabase } from "@/integrations/supabase/client";

const REMEMBER_KEY = "lavoura_remember_me";
const ALIVE_KEY = "lavoura_session_alive";

export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
  } catch {
    // localStorage indisponível (modo privado restrito, etc.) — sem problema,
    // o comportamento padrão do Supabase (sessão persistida) continua valendo
  }
}

export async function enforceRememberMe() {
  let isNewBrowserSession = true;
  try {
    isNewBrowserSession = !sessionStorage.getItem(ALIVE_KEY);
    sessionStorage.setItem(ALIVE_KEY, "1");
  } catch {
    return;
  }

  if (!isNewBrowserSession) return;

  let remembered: string | null = null;
  try {
    remembered = localStorage.getItem(REMEMBER_KEY);
  } catch {
    return;
  }

  // Sem preferência salva (nunca desmarcou) -> mantém o padrão do Supabase
  if (remembered !== "false") return;

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await supabase.auth.signOut();
  }
}
