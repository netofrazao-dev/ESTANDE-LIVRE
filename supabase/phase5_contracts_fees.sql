-- =====================================================================
-- ESTANTE LIVRE — Fase 5: Contratos e Regras de Multa
-- Rode este script no SQL Editor do Supabase DEPOIS de schema.sql (Fase 1)
-- e phase4_auth_sync.sql (Fase 4).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Aceite de contrato — obrigatório em todo novo aluguel.
-- NOT NULL sem default: força o front-end a sempre enviar o timestamp
-- de aceite (o checkbox de Termos de Locação no checkout).
-- ---------------------------------------------------------------------
alter table public.rentals
  add column if not exists terms_accepted_at timestamptz;

-- Preenche eventuais linhas antigas antes de aplicar o NOT NULL
-- (necessário apenas se já existirem aluguéis criados nas fases anteriores).
update public.rentals
  set terms_accepted_at = rented_at
  where terms_accepted_at is null;

alter table public.rentals
  alter column terms_accepted_at set not null;

-- ---------------------------------------------------------------------
-- 2. Multa acumulada (atraso + avarias) — apurada na devolução pelo admin.
-- ---------------------------------------------------------------------
alter table public.rentals
  add column if not exists late_fee_accumulated numeric(10, 2) not null default 0
    check (late_fee_accumulated >= 0);

-- ---------------------------------------------------------------------
-- 3. Estado de conservação do livro na devolução.
-- ---------------------------------------------------------------------
alter table public.rentals
  add column if not exists book_condition_returned text
    check (book_condition_returned in ('none', 'minor_damage', 'destroyed'));

comment on column public.rentals.terms_accepted_at is 'Momento em que o leitor aceitou os Termos de Locação no checkout';
comment on column public.rentals.late_fee_accumulated is 'Soma de multa por atraso + taxa de avaria, apurada na devolução';
comment on column public.rentals.book_condition_returned is 'Condição do livro ao ser devolvido: none | minor_damage | destroyed';
