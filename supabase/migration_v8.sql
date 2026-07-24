-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v8
-- Confirmação de entrega/retirada do pedido
-- ═══════════════════════════════════════════════════════════════════
--
-- Problema que resolve: hoje, quando o cliente faz o checkout pelo site,
-- o empréstimo já nasce como "ativo" e o livro sai do estoque na hora —
-- mas fisicamente o livro só sai da loja quando é retirado ou entregue de
-- verdade. Faltava um jeito de o admin marcar "esse pedido já saiu da
-- loja", separado do status do empréstimo em si.

alter table public.rentals
  add column if not exists delivered_at timestamptz;

comment on column public.rentals.delivered_at is
  'Quando o pedido foi de fato entregue/retirado pelo leitor. Nulo enquanto
   pendente. Não afeta a data de vencimento nem a multa — é só um controle
   operacional de "esse livro já saiu da loja ou ainda está esperando".';

create index if not exists idx_rentals_delivered on public.rentals(delivered_at);
