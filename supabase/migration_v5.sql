-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v5
-- Checkout atômico (corrige corrida de disponibilidade) · Locação no balcão
-- ═══════════════════════════════════════════════════════════════════

-- ── Problema que resolve ───────────────────────────────────────────
-- O checkout antigo fazia, do lado do front-end: 1) insere a locação,
-- 2) chama decrement_available_copies. Entre os dois passos, duas pessoas
-- podiam "ganhar" o último exemplar de um livro ao mesmo tempo. Agora tudo
-- roda dentro de uma única transação no banco, com trava de linha
-- (FOR UPDATE) no livro — a segunda tentativa concorrente espera a
-- primeira terminar e então vê corretamente que não há mais cópias.

-- ── Checkout do próprio leitor (self-service) ──────────────────────
create or replace function public.create_checkout(
  book_ids uuid[],
  rental_days_input int,
  daily_fine_input numeric,
  damage_fee_input numeric,
  loss_fee_input numeric
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  bid uuid;
  avail int;
  book_title text;
  now_ts timestamptz := now();
  due timestamptz := now() + (rental_days_input || ' days')::interval;
  new_rental public.rentals;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  if array_length(book_ids, 1) is null then
    raise exception 'Sacola vazia';
  end if;

  foreach bid in array book_ids loop
    -- Trava a linha do livro até o fim da transação: qualquer outro
    -- checkout concorrente pro mesmo livro espera aqui.
    select available_copies, title into avail, book_title
    from public.books
    where id = bid
    for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;

    if avail <= 0 then
      raise exception 'O livro "%" acabou de ficar indisponível. Remova-o da sacola.', book_title;
    end if;

    update public.books
    set available_copies = available_copies - 1
    where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      daily_fine_rate, rental_days, damage_fee_rate, loss_fee_rate
    ) values (
      auth.uid(), bid, now_ts, due, 'active', now_ts,
      daily_fine_input, rental_days_input, damage_fee_input, loss_fee_input
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- ── Checkout assistido pelo admin (locação no balcão) ───────────────
-- Mesma lógica atômica, mas o admin registra em nome de outro leitor
-- (ex.: alguém que entrou na loja e não usou o site).
create or replace function public.admin_checkout(
  target_user_id uuid,
  book_ids uuid[],
  rental_days_input int,
  daily_fine_input numeric,
  damage_fee_input numeric,
  loss_fee_input numeric
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  bid uuid;
  avail int;
  book_title text;
  now_ts timestamptz := now();
  due timestamptz := now() + (rental_days_input || ' days')::interval;
  new_rental public.rentals;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar locação no balcão';
  end if;

  if array_length(book_ids, 1) is null then
    raise exception 'Selecione ao menos um livro';
  end if;

  foreach bid in array book_ids loop
    select available_copies, title into avail, book_title
    from public.books
    where id = bid
    for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;

    if avail <= 0 then
      raise exception 'O livro "%" não está mais disponível.', book_title;
    end if;

    update public.books
    set available_copies = available_copies - 1
    where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      daily_fine_rate, rental_days, damage_fee_rate, loss_fee_rate, notes
    ) values (
      target_user_id, bid, now_ts, due, 'active', now_ts,
      daily_fine_input, rental_days_input, damage_fee_input, loss_fee_input,
      'Registrado no balcão pelo admin'
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;
