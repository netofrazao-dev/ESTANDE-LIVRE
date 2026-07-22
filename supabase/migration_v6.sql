-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v6
-- Planos de preço · Multa normal/reservada · Dano granular · Entrega
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. PLANOS DE PREÇO (por categoria de livro)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.pricing_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamptz default now() not null
);

create table if not exists public.pricing_plan_tiers (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.pricing_plans(id) on delete cascade,
  days int not null check (days > 0),
  price numeric(10,2) not null check (price >= 0),
  daily_fine_normal numeric(10,2) not null check (daily_fine_normal >= 0),
  daily_fine_reserved numeric(10,2) not null check (daily_fine_reserved >= 0),
  created_at timestamptz default now() not null,

  unique (plan_id, days)
);

comment on table public.pricing_plans is
  'Categorias de preço (ex: Padrão, Especial). Cada livro pertence a um plano.';
comment on table public.pricing_plan_tiers is
  'Opções de prazo dentro de um plano: X dias custa R$Y, multa normal e multa
   de livro reservado (aplicada quando há fila de espera ativa no atraso).';

alter table public.pricing_plans enable row level security;
alter table public.pricing_plan_tiers enable row level security;

drop policy if exists "pricing_plans_read_all" on public.pricing_plans;
create policy "pricing_plans_read_all" on public.pricing_plans for select using (true);
drop policy if exists "pricing_plans_admin_write" on public.pricing_plans;
create policy "pricing_plans_admin_write" on public.pricing_plans for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pricing_plan_tiers_read_all" on public.pricing_plan_tiers;
create policy "pricing_plan_tiers_read_all" on public.pricing_plan_tiers for select using (true);
drop policy if exists "pricing_plan_tiers_admin_write" on public.pricing_plan_tiers;
create policy "pricing_plan_tiers_admin_write" on public.pricing_plan_tiers for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Livros ganham plano de preço e valor de reposição ──────────────
alter table public.books
  add column if not exists pricing_plan_id uuid references public.pricing_plans(id) on delete set null,
  add column if not exists replacement_value numeric(10,2) default 0 not null;

comment on column public.books.replacement_value is
  'Valor de um exemplar novo — cobrado em caso de perda ou capa arrancada.';

-- ═══════════════════════════════════════════════════════════════════
-- 2. PLANOS COMBO (ex: 3 livros por 30 dias por R$50)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.combo_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  book_count int not null check (book_count > 0),
  days int not null check (days > 0),
  price numeric(10,2) not null check (price >= 0),
  active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table public.combo_plans enable row level security;
drop policy if exists "combo_plans_read_all" on public.combo_plans;
create policy "combo_plans_read_all" on public.combo_plans for select using (true);
drop policy if exists "combo_plans_admin_write" on public.combo_plans;
create policy "combo_plans_admin_write" on public.combo_plans for all
  using (public.is_admin()) with check (public.is_admin());

-- Um checkout de combo é UM pagamento (o preço não deve ser somado várias
-- vezes, uma por livro) — por isso vive numa tabela própria, e cada
-- locação do combo aponta pra ela.
create table if not exists public.combo_checkouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  combo_plan_id uuid not null references public.combo_plans(id) on delete restrict,
  price numeric(10,2) not null,
  paid boolean default false not null,
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz default now() not null
);

alter table public.combo_checkouts enable row level security;
drop policy if exists "combo_checkouts_select_own" on public.combo_checkouts;
create policy "combo_checkouts_select_own" on public.combo_checkouts for select
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "combo_checkouts_admin_write" on public.combo_checkouts;
create policy "combo_checkouts_admin_write" on public.combo_checkouts for update
  using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- 3. CONFIGURAÇÕES NOVAS (taxas de dano e multa padrão do combo)
-- ═══════════════════════════════════════════════════════════════════

alter table public.settings
  add column if not exists minor_damage_fee numeric(10,2) default 20.00 not null,
  add column if not exists lost_admin_fee numeric(10,2) default 15.00 not null,
  add column if not exists combo_daily_fine_normal numeric(10,2) default 1.75 not null,
  add column if not exists combo_daily_fine_reserved numeric(10,2) default 2.65 not null;

comment on column public.settings.minor_damage_fee is
  'Cobrança fixa para dano leve na capa (amassado/rasgo pequeno)';
comment on column public.settings.lost_admin_fee is
  'Taxa administrativa somada ao valor de reposição, em caso de perda ou capa arrancada';

-- ═══════════════════════════════════════════════════════════════════
-- 4. AMPLIAR RENTALS
-- ═══════════════════════════════════════════════════════════════════

alter table public.rentals
  add column if not exists pricing_tier_id uuid references public.pricing_plan_tiers(id) on delete set null,
  add column if not exists combo_checkout_id uuid references public.combo_checkouts(id) on delete set null,
  add column if not exists price numeric(10,2) default 0 not null,
  add column if not exists rental_paid boolean default false not null,
  add column if not exists rental_paid_at timestamptz,
  add column if not exists rental_payment_method text,
  add column if not exists renewal_days int,
  add column if not exists daily_fine_normal numeric(10,2),
  add column if not exists daily_fine_reserved numeric(10,2),
  add column if not exists fine_used_reserved_rate boolean default false not null,
  add column if not exists damage_type text, -- 'minor_cover' | 'torn_cover' | 'lost'
  add column if not exists resolved_at timestamptz,
  add column if not exists delivery_method text default 'pickup' not null, -- 'pickup' | 'delivery'
  add column if not exists delivery_address text;

comment on column public.rentals.price is
  'Preço da locação (congelado no checkout). Fica 0 se fizer parte de um
   combo — nesse caso o valor vive em combo_checkouts, pra não contar
   3x o preço de um pacote de 3 livros.';
comment on column public.rentals.renewal_days is
  'Dias de renovação escolhidos pelo leitor no momento do checkout —
   usado como padrão quando ele renovar de fato.';
comment on column public.rentals.fine_used_reserved_rate is
  'Qual taxa de multa foi aplicada (normal ou reservada) — travada no
   momento da devolução/classificação, junto com resolved_at.';
comment on column public.rentals.resolved_at is
  'Quando a pendência (multa + reposição/dano) foi totalmente quitada.
   Enquanto for nulo em locações danificadas/perdidas, a multa de atraso
   continua sendo calculada dinamicamente até hoje.';

-- ═══════════════════════════════════════════════════════════════════
-- 5. RPCs DE CHECKOUT (substituem as da migration_v5)
-- ═══════════════════════════════════════════════════════════════════

-- Checkout normal — cada livro com seu próprio prazo/tier escolhido
-- items: [{"book_id": "...", "pricing_tier_id": "...", "renewal_days": 7}, ...]
-- A assinatura mudou (agora recebe um jsonb com prazo por livro, em vez de
-- um prazo único pra todos) — sem o DROP explícito, o Postgres criaria uma
-- SEGUNDA função com esse nome ao lado da antiga, em vez de substituir, e
-- isso confundiria o Supabase na hora de decidir qual chamar.
drop function if exists public.create_checkout(uuid[], int, numeric, numeric, numeric);

create or replace function public.create_checkout(
  items jsonb,
  delivery_method text default 'pickup',
  delivery_address text default null
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  item jsonb;
  bid uuid;
  tier_id uuid;
  ren_days int;
  avail int;
  book_title text;
  book_plan_id uuid;
  tier public.pricing_plan_tiers;
  now_ts timestamptz := now();
  new_rental public.rentals;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Sacola vazia';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    bid := (item->>'book_id')::uuid;
    tier_id := (item->>'pricing_tier_id')::uuid;
    ren_days := coalesce((item->>'renewal_days')::int, 0);

    select available_copies, title, pricing_plan_id into avail, book_title, book_plan_id
    from public.books where id = bid for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;
    if avail <= 0 then
      raise exception 'O livro "%" acabou de ficar indisponível.', book_title;
    end if;

    select * into tier from public.pricing_plan_tiers
    where id = tier_id and plan_id = book_plan_id;
    if tier.id is null then
      raise exception 'Período inválido para o livro "%".', book_title;
    end if;

    update public.books set available_copies = available_copies - 1 where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      pricing_tier_id, price, rental_days, renewal_days,
      daily_fine_normal, daily_fine_reserved,
      damage_fee_rate, loss_fee_rate,
      delivery_method, delivery_address
    ) values (
      auth.uid(), bid, now_ts, now_ts + (tier.days || ' days')::interval, 'active', now_ts,
      tier.id, tier.price, tier.days, ren_days,
      tier.daily_fine_normal, tier.daily_fine_reserved,
      0, 0, -- valor de dano agora é calculado na devolução (replacement_value do livro + taxas)
      delivery_method, delivery_address
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- Checkout combo — N livros por um preço fixo total (não soma por livro)
create or replace function public.create_combo_checkout(
  combo_plan_id_input uuid,
  book_ids uuid[],
  renewal_days_input int default 0,
  delivery_method text default 'pickup',
  delivery_address text default null
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  combo public.combo_plans;
  bid uuid;
  avail int;
  book_title text;
  checkout_id uuid;
  now_ts timestamptz := now();
  due timestamptz;
  new_rental public.rentals;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  select * into combo from public.combo_plans where id = combo_plan_id_input and active;
  if combo.id is null then
    raise exception 'Combo não encontrado ou inativo';
  end if;

  if array_length(book_ids, 1) is distinct from combo.book_count then
    raise exception 'Este combo exige exatamente % livro(s).', combo.book_count;
  end if;

  due := now_ts + (combo.days || ' days')::interval;

  insert into public.combo_checkouts (user_id, combo_plan_id, price)
  values (auth.uid(), combo.id, combo.price)
  returning id into checkout_id;

  foreach bid in array book_ids loop
    select available_copies, title into avail, book_title
    from public.books where id = bid for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;
    if avail <= 0 then
      raise exception 'O livro "%" acabou de ficar indisponível.', book_title;
    end if;

    update public.books set available_copies = available_copies - 1 where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      combo_checkout_id, price, rental_days, renewal_days,
      daily_fine_normal, daily_fine_reserved,
      damage_fee_rate, loss_fee_rate,
      delivery_method, delivery_address
    )
    select
      auth.uid(), bid, now_ts, due, 'active', now_ts,
      checkout_id, 0, combo.days, renewal_days_input,
      s.combo_daily_fine_normal, s.combo_daily_fine_reserved,
      0, 0,
      delivery_method, delivery_address
    from public.settings s where s.id = 1
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- ── Versões "no balcão" (admin registra em nome de outro leitor) ───
-- Mesmo motivo do create_checkout acima: assinatura mudou, precisa dropar
-- a versão antiga explicitamente pra não sobrar duas funções com esse nome.
drop function if exists public.admin_checkout(uuid, uuid[], int, numeric, numeric, numeric);

create or replace function public.admin_checkout(
  target_user_id uuid,
  items jsonb,
  delivery_method text default 'pickup',
  delivery_address text default null
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  item jsonb;
  bid uuid;
  tier_id uuid;
  ren_days int;
  avail int;
  book_title text;
  book_plan_id uuid;
  tier public.pricing_plan_tiers;
  now_ts timestamptz := now();
  new_rental public.rentals;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar locação no balcão';
  end if;

  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Selecione ao menos um livro';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    bid := (item->>'book_id')::uuid;
    tier_id := (item->>'pricing_tier_id')::uuid;
    ren_days := coalesce((item->>'renewal_days')::int, 0);

    select available_copies, title, pricing_plan_id into avail, book_title, book_plan_id
    from public.books where id = bid for update;

    if avail is null then raise exception 'Livro não encontrado'; end if;
    if avail <= 0 then raise exception 'O livro "%" não está mais disponível.', book_title; end if;

    select * into tier from public.pricing_plan_tiers
    where id = tier_id and plan_id = book_plan_id;
    if tier.id is null then
      raise exception 'Período inválido para o livro "%".', book_title;
    end if;

    update public.books set available_copies = available_copies - 1 where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      pricing_tier_id, price, rental_days, renewal_days,
      daily_fine_normal, daily_fine_reserved,
      damage_fee_rate, loss_fee_rate,
      delivery_method, delivery_address, notes
    ) values (
      target_user_id, bid, now_ts, now_ts + (tier.days || ' days')::interval, 'active', now_ts,
      tier.id, tier.price, tier.days, ren_days,
      tier.daily_fine_normal, tier.daily_fine_reserved,
      0, 0,
      delivery_method, delivery_address, 'Registrado no balcão pelo admin'
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. RENOVAÇÃO — usa os dias escolhidos no checkout, não mais um padrão
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.renew_rental(rental_id_input uuid, extension_days int default null)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
  days_to_add int;
begin
  select * into r from public.rentals where id = rental_id_input for update;

  if r.id is null then
    raise exception 'Empréstimo não encontrado';
  end if;
  if r.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Sem permissão para renovar este empréstimo';
  end if;
  if r.status <> 'active' then
    raise exception 'Só é possível renovar empréstimos em curso';
  end if;
  if r.due_date < now() then
    raise exception 'Empréstimo em atraso não pode ser renovado — regularize primeiro';
  end if;
  if r.renewals_count >= r.max_renewals then
    raise exception 'Limite de renovações já utilizado';
  end if;
  if exists (
    select 1 from public.reservations
    where book_id = r.book_id and status in ('waiting', 'notified')
  ) then
    raise exception 'Há leitores na fila de espera — não é possível renovar';
  end if;

  -- Usa os dias de renovação escolhidos no checkout, a não ser que um
  -- valor explícito seja passado (ex.: ajuste manual do admin).
  days_to_add := coalesce(extension_days, nullif(r.renewal_days, 0), r.rental_days, 14);

  update public.rentals
  set due_date = due_date + (days_to_add || ' days')::interval,
      renewals_count = renewals_count + 1
  where id = rental_id_input
  returning * into r;

  return r;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. DEVOLUÇÃO COM DANO GRANULAR
-- ═══════════════════════════════════════════════════════════════════

-- Substitui o fluxo antigo de devolução: agora recebe uma "condição"
-- granular e calcula as cobranças de acordo com as regras de negócio.
-- condition: 'ok' | 'minor_cover' | 'torn_cover' | 'lost'
create or replace function public.process_return(
  rental_id_input uuid,
  condition text,
  admin_notes text default null
)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
  b public.books;
  s public.settings;
  applicable_rate numeric;
  has_reservation boolean;
  computed_late_fee numeric;
  new_status text;
  new_damage_fee numeric := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar devoluções';
  end if;

  select * into r from public.rentals where id = rental_id_input for update;
  if r.id is null then raise exception 'Empréstimo não encontrado'; end if;

  select * into b from public.books where id = r.book_id;
  select * into s from public.settings where id = 1;

  -- Verifica se há fila de espera ativa AGORA para decidir a taxa de multa
  select exists(
    select 1 from public.reservations
    where book_id = r.book_id and status in ('waiting', 'notified')
  ) into has_reservation;

  applicable_rate := case
    when has_reservation then coalesce(r.daily_fine_reserved, r.daily_fine_rate)
    else coalesce(r.daily_fine_normal, r.daily_fine_rate)
  end;

  computed_late_fee := greatest(0, extract(day from (now() - r.due_date)))::numeric * coalesce(applicable_rate, 0);

  case condition
    when 'ok' then
      new_status := 'returned';
      new_damage_fee := 0;
      update public.books set available_copies = least(total_copies, available_copies + 1) where id = r.book_id;
    when 'minor_cover' then
      new_status := 'damaged';
      new_damage_fee := coalesce(s.minor_damage_fee, 20);
      update public.books set available_copies = least(total_copies, available_copies + 1) where id = r.book_id;
    when 'torn_cover' then
      new_status := 'lost'; -- capa arrancada = livro sai do acervo, mesma regra de perda
      new_damage_fee := coalesce(b.replacement_value, 0) + coalesce(s.lost_admin_fee, 15);
      -- não volta ao estoque
    when 'lost' then
      new_status := 'lost';
      new_damage_fee := coalesce(b.replacement_value, 0) + coalesce(s.lost_admin_fee, 15);
      -- não volta ao estoque
    else
      raise exception 'Condição inválida: %', condition;
  end case;

  update public.rentals
  set status = new_status,
      returned_at = now(),
      damage_type = case when condition = 'ok' then null else condition end,
      damage_fee = new_damage_fee,
      late_fee = computed_late_fee,
      fine_used_reserved_rate = has_reservation,
      -- Devolução limpa (sem dano/perda) resolve tudo na hora, já que não
      -- há pendência de reposição — só falta cobrar a multa, se houver.
      resolved_at = case when condition = 'ok' then now() else null end,
      notes = coalesce(admin_notes, notes)
  where id = rental_id_input
  returning * into r;

  return r;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 8. PAGAMENTO — recalcula a multa em aberto na hora de quitar,
--    e marca "resolvido" quando não sobra mais pendência
-- ═══════════════════════════════════════════════════════════════════

-- Assinatura mudou (ganhou o parâmetro pay_rental) — drop explícito da
-- versão antiga pelo mesmo motivo das funções de checkout acima.
drop function if exists public.register_payment(uuid, boolean, boolean, text, text);

create or replace function public.register_payment(
  rental_id_input uuid,
  pay_late boolean default true,
  pay_damage boolean default true,
  pay_rental boolean default false,
  method text default 'cash',
  notes_input text default null
)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
  applicable_rate numeric;
  computed_late_fee numeric;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar pagamentos';
  end if;

  select * into r from public.rentals where id = rental_id_input for update;
  if r.id is null then raise exception 'Empréstimo não encontrado'; end if;

  -- Locações danificadas/perdidas ainda não resolvidas: a multa continua
  -- crescendo dia a dia. Ao dar baixa agora, trava o valor no que está
  -- devido hoje — é isso que "resolve" a pendência.
  if pay_late and not r.late_fee_paid then
    if r.status in ('damaged', 'lost') and r.resolved_at is null then
      applicable_rate := case
        when r.fine_used_reserved_rate then coalesce(r.daily_fine_reserved, r.daily_fine_rate)
        else coalesce(r.daily_fine_normal, r.daily_fine_rate)
      end;
      computed_late_fee := greatest(0, extract(day from (now() - r.due_date)))::numeric * coalesce(applicable_rate, 0);
      update public.rentals set late_fee = computed_late_fee where id = rental_id_input;
    end if;
    update public.rentals set late_fee_paid = true where id = rental_id_input;
  end if;

  if pay_damage and not r.damage_fee_paid then
    update public.rentals set damage_fee_paid = true where id = rental_id_input;
  end if;

  if pay_rental and not r.rental_paid then
    update public.rentals set rental_paid = true, rental_paid_at = now() where id = rental_id_input;
  end if;

  update public.rentals
  set paid_at = now(),
      payment_method = method,
      payment_notes = coalesce(notes_input, payment_notes),
      updated_at = now()
  where id = rental_id_input
  returning * into r;

  -- Fecha a pendência definitivamente quando multa e dano (se houver)
  -- já estiverem quitados.
  if r.status in ('damaged', 'lost') and r.resolved_at is null
     and r.late_fee_paid
     and (r.damage_fee = 0 or r.damage_fee_paid) then
    update public.rentals set resolved_at = now() where id = rental_id_input
    returning * into r;
  end if;

  return r;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 9. reader_stats — agora considera também o preço do aluguel em aberto
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.reader_stats(reader_id uuid)
returns table (
  total_rentals bigint,
  active_rentals bigint,
  late_returns bigint,
  damaged_returns bigint,
  lost_returns bigint,
  total_fines_paid numeric,
  total_fines_pending numeric,
  late_return_rate numeric
)
language sql
stable
as $$
  with agg as (
    select
      count(*) as total,
      count(*) filter (where status = 'active') as active,
      count(*) filter (where returned_at > due_date and status in ('returned','damaged','lost')) as late,
      count(*) filter (where status = 'damaged') as damaged,
      count(*) filter (where status = 'lost') as lost,
      coalesce(sum(case when rental_paid then price else 0 end), 0) +
      coalesce(sum(case when late_fee_paid then late_fee else 0 end), 0) +
      coalesce(sum(case when damage_fee_paid then damage_fee else 0 end), 0) as paid,
      coalesce(sum(case when not rental_paid then price else 0 end), 0) +
      coalesce(sum(case when not late_fee_paid then late_fee else 0 end), 0) +
      coalesce(sum(case when not damage_fee_paid then damage_fee else 0 end), 0) as pending
    from public.rentals
    where user_id = reader_id
  )
  select
    total,
    active,
    late,
    damaged,
    lost,
    paid,
    pending,
    case when total > 0
      then round((late::numeric / total::numeric) * 100, 1)
      else 0
    end as rate
  from agg;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 10. Ajustar view financeira pra incluir o preço do aluguel em aberto
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 11. Seed dos planos de preço (valores de exemplo — REVISE no admin!)
-- ═══════════════════════════════════════════════════════════════════
-- O documento de regras deu "exemplos" de valores, não um mapeamento
-- exato de qual multa cai em qual prazo. Os números abaixo são um
-- pareamento razoável pra você já sair testando — mas confira e ajuste
-- em /admin/planos-de-preco, porque foi uma interpretação, não uma
-- transcrição literal do que você pediu.

insert into public.pricing_plans (name, description)
values
  ('Padrão', 'Livros mais em conta'),
  ('Especial — Tolkien & C. S. Lewis', 'Livros mais caros')
on conflict (name) do nothing;

insert into public.pricing_plan_tiers (plan_id, days, price, daily_fine_normal, daily_fine_reserved)
select id, 7, 5.00, 0.75, 1.50 from public.pricing_plans where name = 'Padrão'
union all
select id, 14, 10.00, 1.00, 1.75 from public.pricing_plans where name = 'Padrão'
union all
select id, 21, 15.00, 1.50, 2.00 from public.pricing_plans where name = 'Padrão'
union all
select id, 30, 20.00, 1.75, 2.20 from public.pricing_plans where name = 'Padrão'
on conflict (plan_id, days) do nothing;

insert into public.pricing_plan_tiers (plan_id, days, price, daily_fine_normal, daily_fine_reserved)
select id, 10, 10.00, 1.00, 2.00 from public.pricing_plans where name = 'Especial — Tolkien & C. S. Lewis'
union all
select id, 20, 20.00, 1.50, 2.40 from public.pricing_plans where name = 'Especial — Tolkien & C. S. Lewis'
union all
select id, 30, 26.00, 1.75, 2.65 from public.pricing_plans where name = 'Especial — Tolkien & C. S. Lewis'
on conflict (plan_id, days) do nothing;

insert into public.combo_plans (name, book_count, days, price)
select '3 livros por 30 dias', 3, 30, 50.00
where not exists (select 1 from public.combo_plans where name = '3 livros por 30 dias');

-- Livros já cadastrados sem plano de preço ganham o plano "Padrão", pra
-- não travar o checkout enquanto você distribui os planos certos.
update public.books
set pricing_plan_id = (select id from public.pricing_plans where name = 'Padrão')
where pricing_plan_id is null;

-- DROP + CREATE em vez de "or replace": o Postgres não permite mudar a
-- ordem/nome de colunas de uma view existente com "or replace" — só
-- adicionar colunas no final. Como aqui a ordem muda (price entra no
-- meio), precisa recriar a view do zero.
drop view if exists public.financial_pending_view;

create view public.financial_pending_view as
select
  r.id as rental_id,
  r.user_id,
  p.full_name,
  p.email,
  p.phone,
  b.id as book_id,
  b.title as book_title,
  r.status,
  r.returned_at,
  r.due_date,
  r.price,
  r.rental_paid,
  r.late_fee,
  r.late_fee_paid,
  r.damage_fee,
  r.damage_fee_paid,
  r.resolved_at,
  case when not r.rental_paid then r.price else 0 end +
  case when not r.late_fee_paid then r.late_fee else 0 end +
  case when not r.damage_fee_paid then r.damage_fee else 0 end as pending_amount
from public.rentals r
join public.profiles p on p.id = r.user_id
join public.books b on b.id = r.book_id
where (
    (r.price > 0 and not r.rental_paid) or
    (r.late_fee > 0 and not r.late_fee_paid) or
    (r.damage_fee > 0 and not r.damage_fee_paid)
  );
