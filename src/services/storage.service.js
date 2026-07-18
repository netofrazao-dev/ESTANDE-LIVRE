// Camada de acesso ao Supabase Storage — upload de capas de livros.

import { supabase } from '../lib/supabaseClient';

const BUCKET = 'book-covers';
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function generateFileName(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${random}.${ext}`;
}

/** Envia um arquivo de capa para o bucket público e retorna a URL final. */
export async function uploadBookCover(file) {
  if (!file) return null;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato de imagem inválido. Use JPG, PNG ou WEBP.');
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`A imagem deve ter no máximo ${MAX_FILE_SIZE_MB}MB.`);
  }

  const fileName = generateFileName(file);

  const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/** Remove uma capa do bucket a partir da URL pública salva no livro. */
export async function deleteBookCover(coverUrl) {
  if (!coverUrl) return;
  const fileName = coverUrl.split(`${BUCKET}/`).pop();
  if (!fileName) return;

  const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
  if (error) throw error;
}
