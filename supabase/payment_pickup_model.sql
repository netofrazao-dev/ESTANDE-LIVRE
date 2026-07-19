-- =====================================================================
-- ESTANTE LIVRE — Pagamento na retirada
-- Modelo de negócio definido: reserva 100% online, pagamento acontece
-- presencialmente no balcão, no momento da retirada do livro.
-- Rode DEPOIS de todos os scripts anteriores.
-- =====================================================================

alter table public.rentals
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid'));

alter table public.rentals
  add column if not exists payment_confirmed_at timestamptz;

comment on column public.rentals.payment_status is
  'pending = aguardando retirada/pagamento no balcão · paid = pagamento recebido na retirada';
comment on column public.rentals.payment_confirmed_at is
  'Momento em que o admin confirmou o recebimento do pagamento na retirada';

-- Índice de apoio para o Admin Dashboard filtrar "aguardando retirada".
create index if not exists idx_rentals_payment_status on public.rentals (payment_status);
