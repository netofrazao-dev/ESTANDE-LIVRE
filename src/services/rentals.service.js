// Camada de acesso a dados para "rentals" — checkout, painel do leitor e admin.

import { supabase } from '../lib/supabaseClient';

export const RENTAL_PERIOD_DAYS = 14;

/**
 * Estimativa de data de devolução para exibição (ex: na sacola, antes do
 * checkout). O valor real e definitivo é sempre calculado pelo servidor
 * no momento do INSERT (trigger `set_rental_defaults`).
 */
export function calculateDueDate() {
  const due = new Date();
  due.setDate(due.getDate() + RENTAL_PERIOD_DAYS);
  return due.toISOString().slice(0, 10);
}

/**
 * Checkout: pega os itens da sacola e cria um registro em `rentals` para
 * cada livro. Exige o aceite dos Termos de Locação (checkbox no checkout)
 * — grava `terms_accepted_at`. `due_date` e `total_price` NÃO são
 * calculados aqui: um trigger no banco (`set_rental_defaults`) sempre
 * recalcula esses valores no servidor, ignorando o que vier do cliente —
 * isso evita que alguém manipule prazo ou preço via uma chamada direta à API.
 * Não limpa a sacola — isso é responsabilidade de quem chama (useCheckout).
 */
export async function createRentalsFromCart(items, userId, { termsAcceptedAt } = {}) {
  if (!userId) throw new Error('Você precisa entrar na sua conta para alugar livros.');
  if (!items?.length) throw new Error('Sua sacola está vazia.');
  if (!termsAcceptedAt) throw new Error('É necessário aceitar os Termos de Locação para continuar.');

  const rows = items.map((book) => ({
    user_id: userId,
    book_id: book.id,
    terms_accepted_at: termsAcceptedAt,
    // due_date e total_price: preenchidos pelo trigger set_rental_defaults no banco.
  }));

  const { data, error } = await supabase.from('rentals').insert(rows).select();
  if (error) throw error;
  return data;
}

/** Aluguéis ativos do leitor logado, com dados do livro embutidos. */
export async function fetchMyActiveRentals(userId) {
  const { data, error } = await supabase
    .from('rentals')
    .select('id, rented_at, due_date, status, total_price, books(id, title, author, cover_url)')
    .eq('user_id', userId)
    .in('status', ['active', 'overdue'])
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data;
}

/** [ADMIN] Todos os aluguéis ativos da locadora, com livro + leitor embutidos. */
export async function fetchAllActiveRentals() {
  const { data, error } = await supabase
    .from('rentals')
    .select(
      'id, rented_at, due_date, status, total_price, books(id, title, author, cover_url), users(id, full_name, email)'
    )
    .in('status', ['active', 'overdue'])
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * [ADMIN] Confirma a devolução — o trigger do banco já repõe o estoque em `books`.
 * `extra` pode incluir { book_condition_returned, late_fee_accumulated }, apurados
 * no modal de checklist de devolução (danos + multa por atraso).
 */
export async function confirmReturn(rentalId, extra = {}) {
  const { data, error } = await supabase
    .from('rentals')
    .update({
      status: 'returned',
      returned_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', rentalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function isOverdue(rental) {
  if (!rental || rental.status === 'returned') return false;
  const today = new Date().toISOString().slice(0, 10);
  return rental.due_date < today;
}
