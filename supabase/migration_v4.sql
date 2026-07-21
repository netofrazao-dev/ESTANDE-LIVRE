-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Migração v4
-- Configurações do sistema (editáveis pelo admin, sem precisar de deploy)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.settings (
  id int primary key default 1,
  max_books_per_rental int default 3 not null,
  rental_days int default 14 not null,
  daily_fine numeric(10,2) default 2.00 not null,
  damage_fee numeric(10,2) default 50.00 not null,
  loss_fee numeric(10,2) default 150.00 not null,
  store_name text default 'Estande Livre' not null,
  store_address text,
  store_phone text,
  store_hours text,
  updated_at timestamptz default now() not null,

  constraint settings_singleton check (id = 1)
);

comment on table public.settings is
  'Linha única (id=1) com as configurações vigentes do sistema. Locações já
   criadas NÃO são afetadas por mudanças aqui — os valores ficam congelados
   por locação em rentals.rental_days / daily_fine_rate / damage_fee_rate /
   loss_fee_rate no momento do aceite do contrato.';

-- Garante que a linha singleton existe (idempotente)
insert into public.settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.settings enable row level security;

-- Todos leem (o site público precisa saber prazo/multa antes do checkout)
drop policy if exists "settings_read_all" on public.settings;
create policy "settings_read_all"
  on public.settings for select
  using (true);

-- Só admin edita
drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write"
  on public.settings for update
  using (public.is_admin())
  with check (public.is_admin());
