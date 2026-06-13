-- Novo papel de aplicação: franqueado (acesso ao Sistema Lavoura / área "/app")
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'franqueado';
