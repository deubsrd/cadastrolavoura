
-- Enum para tipo de sócio
CREATE TYPE public.tipo_socio AS ENUM ('administrador', 'cotista');

-- Enum para roles de aplicação
CREATE TYPE public.app_role AS ENUM ('admin');

-- Tabela de unidades (gerenciadas pelo admin)
CREATE TABLE public.unidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  nome TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de sócios
CREATE TABLE public.socios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  numero_unidade TEXT NOT NULL,
  tipo public.tipo_socio NOT NULL,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  rg TEXT NOT NULL,
  rg_orgao TEXT NOT NULL,
  cpf TEXT NOT NULL,
  logradouro TEXT NOT NULL,
  numero_casa TEXT NOT NULL,
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  cep TEXT NOT NULL,
  nacionalidade TEXT NOT NULL,
  estado_civil TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_socios_unidade ON public.socios(unidade_id);
CREATE INDEX idx_socios_numero_unidade ON public.socios(numero_unidade);

-- Tabela de roles (segurança - separada do auth.users)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Função security definer para checar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger: ao criar usuário com email autorizado, atribui role admin automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'lavanderialavoura2025@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_unidades_updated_at BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_socios_updated_at BEFORE UPDATE ON public.socios
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Unidades: leitura pública (para o formulário público), escrita só admin
CREATE POLICY "Unidades são visíveis publicamente"
  ON public.unidades FOR SELECT
  USING (true);

CREATE POLICY "Admin pode inserir unidades"
  ON public.unidades FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode atualizar unidades"
  ON public.unidades FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode excluir unidades"
  ON public.unidades FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Sócios: qualquer um pode inserir (cadastro público), só admin lê/edita/exclui
CREATE POLICY "Qualquer pessoa pode cadastrar sócios"
  ON public.socios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin pode visualizar sócios"
  ON public.socios FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode atualizar sócios"
  ON public.socios FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode excluir sócios"
  ON public.socios FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: usuários autenticados podem ver suas próprias roles
CREATE POLICY "Usuários veem suas próprias roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
