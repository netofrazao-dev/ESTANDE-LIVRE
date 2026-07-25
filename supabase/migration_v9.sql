-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v9
-- Ocultar livro do catálogo público
-- ═══════════════════════════════════════════════════════════════════
--
-- Problema que resolve: às vezes o admin precisa tirar um livro de
-- circulação temporariamente (organizando algo, resolvendo uma pendência
-- com aquele exemplar) sem apagar o cadastro nem mexer no estoque. Isso
-- não existia — só dava pra "esconder" zerando as cópias disponíveis, o
-- que é uma informação diferente (esgotado ≠ oculto de propósito).

alter table public.books
  add column if not exists hidden boolean default false not null;

comment on column public.books.hidden is
  'Quando true, o livro não aparece no catálogo público nem na busca, e
   não pode ser alugado — mesmo que tenha cópias disponíveis. Controle
   manual do admin, independente do estoque.';

create index if not exists idx_books_hidden on public.books(hidden) where hidden = false;

-- ── Trava de segurança: mesmo que alguém tente pelo checkout direto,
-- o banco recusa alugar um livro oculto ────────────────────────────

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
  book_hidden boolean;
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

    select available_copies, title, pricing_plan_id, hidden
    into avail, book_title, book_plan_id, book_hidden
    from public.books where id = bid for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;
    if book_hidden then
      raise exception 'O livro "%" não está disponível para locação no momento.', book_title;
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
      0, 0,
      delivery_method, delivery_address
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

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
  book_hidden boolean;
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
    select available_copies, title, hidden into avail, book_title, book_hidden
    from public.books where id = bid for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;
    if book_hidden then
      raise exception 'O livro "%" não está disponível para locação no momento.', book_title;
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

    select available_copies, title, pricing_plan_id
    into avail, book_title, book_plan_id
    from public.books where id = bid for update;

    if avail is null then raise exception 'Livro não encontrado'; end if;
    -- Nota: no balcão o admin PODE alugar um livro oculto conscientemente
    -- (ex.: já resolveu a pendência e quer liberar na hora, sem precisar
    -- destravar antes) — por isso não bloqueamos aqui, diferente do
    -- checkout público.
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

-- Reserva também não pode ser feita num livro oculto
create or replace function public.create_reservation(book_id_input uuid)
returns public.reservations
language plpgsql
security definer
as $$
declare
  res public.reservations;
  book_available int;
  book_hidden boolean;
  already_has_active bool;
  already_renting bool;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  select available_copies, hidden into book_available, book_hidden
  from public.books where id = book_id_input;
  if book_available is null then
    raise exception 'Livro não encontrado';
  end if;
  if book_hidden then
    raise exception 'Este livro não está disponível no momento';
  end if;

  if book_available > 0 then
    raise exception 'Este livro está disponível para retirada direta';
  end if;

  select exists (
    select 1 from public.reservations
    where user_id = auth.uid()
      and book_id = book_id_input
      and status in ('waiting', 'notified')
  ) into already_has_active;
  if already_has_active then
    raise exception 'Você já está na fila deste livro';
  end if;

  select exists (
    select 1 from public.rentals
    where user_id = auth.uid()
      and book_id = book_id_input
      and status = 'active'
  ) into already_renting;
  if already_renting then
    raise exception 'Você já está com este livro em curso';
  end if;

  insert into public.reservations (user_id, book_id, status)
  values (auth.uid(), book_id_input, 'waiting')
  returning * into res;

  return res;
end;
$$;
