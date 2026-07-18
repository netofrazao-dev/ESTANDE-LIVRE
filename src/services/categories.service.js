// Camada de acesso a dados para "categories" — usada no filtro do catálogo
// e no formulário de cadastro de livro do admin.

import { supabase } from '../lib/supabaseClient';

export async function listCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data;
}
