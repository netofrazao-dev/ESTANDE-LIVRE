-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v3
-- Congelamento dos termos do contrato · Consentimento LGPD
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Congelar valores do contrato no momento do aceite ──────────
-- Problema que resolve: 'daily_fine_rate' já era gravado por locação,
-- mas o prazo (rental_days) e as taxas de dano/extravio eram lidas do
-- RENTAL_CONFIG "ao vivo" no momento da devolução — ou seja, se você
-- mudar o valor da taxa hoje, ela mudaria retroativamente até para
-- contratos assinados há meses. Agora tudo fica congelado no aceite.

alter table public.rentals
  add column if not exists rental_days int default 14 not null,
  add column if not exists damage_fee_rate numeric(10,2) default 50.00 not null,
  add column if not exists loss_fee_rate numeric(10,2) default 150.00 not null;

comment on column public.rentals.rental_days is
  'Prazo em dias vigente no momento do aceite do termo (congelado, não muda retroativamente)';
comment on column public.rentals.damage_fee_rate is
  'Taxa de dano vigente no momento do aceite (congelada)';
comment on column public.rentals.loss_fee_rate is
  'Taxa de extravio/reposição vigente no momento do aceite (congelada)';

-- ── 2. Consentimento LGPD ──────────────────────────────────────────
alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz;

comment on column public.profiles.privacy_accepted_at is
  'Timestamp do aceite da Política de Privacidade no cadastro (LGPD)';

-- Atualiza o trigger de criação de perfil para também gravar o aceite
-- (o front-end manda esse dado em raw_user_meta_data no momento do signUp)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, privacy_accepted_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Leitor'),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'privacy_accepted_at', '')::timestamptz
  );
  return new;
end;
$$;
