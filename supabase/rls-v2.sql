-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — RLS v2 (novas tabelas)
-- ═══════════════════════════════════════════════════════════════════

alter table public.reservations enable row level security;
alter table public.notification_log enable row level security;

-- ═══════════════════════════════════════════════════════════════════
-- RESERVATIONS
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "reservations_select_own" on public.reservations;
create policy "reservations_select_own"
  on public.reservations for select
  using (auth.uid() = user_id);

drop policy if exists "reservations_admin_all" on public.reservations;
create policy "reservations_admin_all"
  on public.reservations for all
  using (public.is_admin())
  with check (public.is_admin());

-- Inserts e updates são feitos via functions (create_reservation, cancel_reservation)
-- Não precisa policy de insert direto porque as SECURITY DEFINER funcs cuidam disso.

-- ═══════════════════════════════════════════════════════════════════
-- NOTIFICATION_LOG
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "notifications_select_own" on public.notification_log;
create policy "notifications_select_own"
  on public.notification_log for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_admin_all" on public.notification_log;
create policy "notifications_admin_all"
  on public.notification_log for all
  using (public.is_admin())
  with check (public.is_admin());
