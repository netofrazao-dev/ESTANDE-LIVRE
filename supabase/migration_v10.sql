-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v10
-- Pagamento parcial de multa com o livro ainda em posse do leitor
-- ═══════════════════════════════════════════════════════════════════
--
-- Problema que resolve: hoje só dava pra registrar pagamento de multa
-- DEPOIS que o livro voltasse — porque o valor da multa só é calculado e
-- travado no momento da devolução. Se o cliente aparece na loja ainda
-- com o livro, atrasado, e quer adiantar o que já deve sem devolver
-- ainda, não tinha como registrar isso.

alter table public.rentals
  add column if not exists late_fee_settled_amount numeric(10,2) default 0 not null,
  add column if not exists late_fee_settled_until timestamptz;

comment on column public.rentals.late_fee_settled_amount is
  'Soma de tudo que já foi pago de multa de atraso ENQUANTO o livro ainda
   estava emprestado (antes da devolução). Some com o valor final travado
   na devolução pra saber o total realmente pago naquele empréstimo.';
comment on column public.rentals.late_fee_settled_until is
  'Até qual data/hora a multa de atraso já foi quitada. Nulo = nunca foi
   feito pagamento parcial, considera desde a due_date. A multa exibida ao
   vivo (e a calculada na devolução) conta só a partir daqui pra frente,
   pra não cobrar duas vezes o mesmo período.';

-- ── RPC: registrar pagamento parcial de multa, livro ainda emprestado ──
create or replace function public.register_partial_late_payment(
  rental_id_input uuid,
  method text default 'cash',
  notes_input text default null
)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
  has_reservation boolean;
  applicable_rate numeric;
  period_start timestamptz;
  amount_now numeric;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar pagamentos';
  end if;

  select * into r from public.rentals where id = rental_id_input for update;
  if r.id is null then
    raise exception 'Empréstimo não encontrado';
  end if;
  if r.status <> 'active' then
    raise exception 'Este empréstimo já foi encerrado — registre o pagamento pela tela de devolução ou na lista de empréstimos.';
  end if;

  period_start := coalesce(r.late_fee_settled_until, r.due_date);

  if now() <= period_start then
    raise exception 'Não há multa em aberto pra quitar neste momento.';
  end if;

  select exists(
    select 1 from public.reservations
    where book_id = r.book_id and status in ('waiting', 'notified')
  ) into has_reservation;

  applicable_rate := case
    when has_reservation then coalesce(r.daily_fine_reserved, r.daily_fine_rate)
    else coalesce(r.daily_fine_normal, r.daily_fine_rate)
  end;

  amount_now := greatest(0, extract(day from (now() - period_start)))::numeric * coalesce(applicable_rate, 0);

  if amount_now <= 0 then
    raise exception 'Não há multa em aberto pra quitar neste momento.';
  end if;

  update public.rentals
  set late_fee_settled_amount = late_fee_settled_amount + amount_now,
      late_fee_settled_until = now(),
      payment_method = method,
      payment_notes = coalesce(notes_input, payment_notes),
      updated_at = now()
  where id = rental_id_input
  returning * into r;

  return r;
end;
$$;

-- ── Ajusta a devolução pra descontar o que já foi pago antes ──────────
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
  period_start timestamptz;
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

  select exists(
    select 1 from public.reservations
    where book_id = r.book_id and status in ('waiting', 'notified')
  ) into has_reservation;

  applicable_rate := case
    when has_reservation then coalesce(r.daily_fine_reserved, r.daily_fine_rate)
    else coalesce(r.daily_fine_normal, r.daily_fine_rate)
  end;

  -- Conta só a partir de onde o leitor já quitou (se ele adiantou algo
  -- enquanto ainda estava com o livro) — não cobra duas vezes o mesmo
  -- período.
  period_start := coalesce(r.late_fee_settled_until, r.due_date);
  computed_late_fee := greatest(0, extract(day from (now() - period_start)))::numeric * coalesce(applicable_rate, 0);

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
      new_status := 'lost';
      new_damage_fee := coalesce(b.replacement_value, 0) + coalesce(s.lost_admin_fee, 15);
    when 'lost' then
      new_status := 'lost';
      new_damage_fee := coalesce(b.replacement_value, 0) + coalesce(s.lost_admin_fee, 15);
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
      late_fee_paid = (computed_late_fee = 0),
      resolved_at = case when condition = 'ok' then now() else null end,
      notes = coalesce(admin_notes, notes)
  where id = rental_id_input
  returning * into r;

  return r;
end;
$$;
