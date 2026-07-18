// Camada de acesso a dados para "books" — catálogo público e CRUD do admin.

import { supabase } from '../lib/supabaseClient';

const BOOK_SELECT = '*, categories(id, name, slug)';

/** Catálogo público — só livros ativos. Aceita busca opcional por título/autor. */
export async function listBooks({ search } = {}) {
  let query = supabase
    .from('books')
    .select(BOOK_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (search) {
    const term = search.replace(/[%_]/g, '').trim();
    if (term) {
      query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** [ADMIN] Todos os livros, incluindo arquivados (is_active = false). */
export async function listAllBooksForAdmin() {
  const { data, error } = await supabase
    .from('books')
    .select(BOOK_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getBookById(id) {
  const { data, error } = await supabase.from('books').select(BOOK_SELECT).eq('id', id).single();
  if (error) throw error;
  return data;
}

/** [ADMIN] Cria um livro novo — available_copies começa igual a total_copies. */
export async function createBook(payload) {
  const row = {
    ...payload,
    total_copies: payload.total_copies ?? 1,
    available_copies: payload.total_copies ?? 1,
  };

  const { data, error } = await supabase.from('books').insert(row).select(BOOK_SELECT).single();
  if (error) throw error;
  return data;
}

/**
 * [ADMIN] Atualiza um livro. Se `total_copies` mudar, recalcula
 * `available_copies` preservando a quantidade já alugada — nunca deixa
 * o disponível ficar negativo nem "perde" cópias que estão com leitores.
 */
export async function updateBook(id, payload) {
  const updates = { ...payload };

  if (payload.total_copies != null) {
    const { data: current, error: fetchError } = await supabase
      .from('books')
      .select('total_copies, available_copies')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    if (payload.total_copies !== current.total_copies) {
      const rentedOut = current.total_copies - current.available_copies;
      const newAvailable = payload.total_copies - rentedOut;

      if (newAvailable < 0) {
        throw new Error(
          `Não é possível reduzir para ${payload.total_copies} cópias: ${rentedOut} já ${
            rentedOut === 1 ? 'está alugada' : 'estão alugadas'
          } agora.`
        );
      }
      updates.available_copies = newAvailable;
    }
  }

  const { data, error } = await supabase
    .from('books')
    .update(updates)
    .eq('id', id)
    .select(BOOK_SELECT)
    .single();

  if (error) throw error;
  return data;
}

/**
 * [ADMIN] Arquiva/reativa um livro (soft delete). Preferimos isso a um
 * DELETE de verdade porque `rentals.book_id` tem `on delete restrict` —
 * um livro com histórico de aluguel não pode ser removido fisicamente.
 */
export async function setBookActive(id, isActive) {
  const { data, error } = await supabase
    .from('books')
    .update({ is_active: isActive })
    .eq('id', id)
    .select(BOOK_SELECT)
    .single();

  if (error) throw error;
  return data;
}
