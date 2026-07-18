import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import { uploadBookCover } from '../../services/storage.service';

const EMPTY_FORM = {
  title: '',
  author: '',
  isbn: '',
  synopsis: '',
  cover_url: '',
  category_id: '',
  publisher: '',
  published_year: '',
  total_copies: 1,
  daily_rental_price: 0,
  is_active: true,
};

/**
 * BookFormModal — usado tanto para criar (book = null) quanto para
 * editar (book = objeto existente) um livro do acervo.
 */
export default function BookFormModal({ book, categories, onClose, onSubmit, isSubmitting = false }) {
  const isEditing = Boolean(book);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (book) {
      setForm({
        title: book.title ?? '',
        author: book.author ?? '',
        isbn: book.isbn ?? '',
        synopsis: book.synopsis ?? '',
        cover_url: book.cover_url ?? '',
        category_id: book.category_id ?? '',
        publisher: book.publisher ?? '',
        published_year: book.published_year ?? '',
        total_copies: book.total_copies ?? 1,
        daily_rental_price: book.daily_rental_price ?? 0,
        is_active: book.is_active ?? true,
      });
      setCoverPreview(book.cover_url ?? null);
    } else {
      setForm(EMPTY_FORM);
      setCoverPreview(null);
    }
    setCoverFile(null);
  }, [book]);

  // Libera a URL temporária de preview quando o componente desmonta/troca de arquivo.
  useEffect(() => {
    return () => {
      if (coverFile && coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverFile, coverPreview]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setForm((f) => ({ ...f, cover_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.author.trim()) {
      setError('Título e autor são obrigatórios.');
      return;
    }

    let coverUrl = form.cover_url || null;

    if (coverFile) {
      setIsUploadingCover(true);
      try {
        coverUrl = await uploadBookCover(coverFile);
      } catch (err) {
        setIsUploadingCover(false);
        setError(err.message ?? 'Não foi possível enviar a capa.');
        return;
      }
      setIsUploadingCover(false);
    }

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim() || null,
      synopsis: form.synopsis.trim() || null,
      cover_url: coverUrl,
      category_id: form.category_id || null,
      publisher: form.publisher.trim() || null,
      published_year: form.published_year ? Number(form.published_year) : null,
      total_copies: Number(form.total_copies),
      daily_rental_price: Number(form.daily_rental_price),
      is_active: form.is_active,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message ?? 'Não foi possível salvar o livro.');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-wood-900/45 px-4 py-8 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-wood-200 bg-parchment-light p-6 shadow-shelf"
      >
        <h2 className="mb-5 font-serif text-xl font-semibold text-wood-800">
          {isEditing ? 'Editar livro' : 'Novo livro'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">Título *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={handleChange('title')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">Autor *</label>
              <input
                type="text"
                required
                value={form.author}
                onChange={handleChange('author')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              />
            </div>

            <div>
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">Categoria</label>
              <select
                value={form.category_id}
                onChange={handleChange('category_id')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              >
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">ISBN</label>
              <input
                type="text"
                value={form.isbn}
                onChange={handleChange('isbn')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">Capa do livro</label>
              <div className="flex items-center gap-4">
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-wood-100 ring-1 ring-wood-200">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Pré-visualização da capa" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-wood-400">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="block w-full font-sans text-xs text-wood-600 file:mr-3 file:rounded-full file:border-0 file:bg-moss-100 file:px-3 file:py-1.5 file:font-sans file:text-xs file:font-semibold file:text-moss-700 hover:file:bg-moss-200"
                  />
                  <div className="mt-1.5 flex items-center gap-3">
                    <p className="font-sans text-[11px] text-wood-400">JPG, PNG ou WEBP · até 5MB</p>
                    {coverPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        className="font-sans text-[11px] font-semibold text-terracotta-600 hover:underline"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">Sinopse</label>
              <textarea
                rows={3}
                value={form.synopsis}
                onChange={handleChange('synopsis')}
                className="w-full resize-none rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              />
            </div>

            <div>
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">Editora</label>
              <input
                type="text"
                value={form.publisher}
                onChange={handleChange('publisher')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              />
            </div>

            <div>
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">Ano</label>
              <input
                type="number"
                value={form.published_year}
                onChange={handleChange('published_year')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              />
            </div>

            <div>
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">
                Total de cópias *
              </label>
              <input
                type="number"
                min={0}
                required
                value={form.total_copies}
                onChange={handleChange('total_copies')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              />
              {isEditing && (
                <p className="mt-1 font-sans text-[11px] text-wood-400">
                  Disponível atual: {book.available_copies}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block font-sans text-xs font-semibold text-wood-600">
                Preço/dia (R$) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.daily_rental_price}
                onChange={handleChange('daily_rental_price')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3 py-2 font-sans text-sm text-wood-800 shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              />
            </div>

            {isEditing && (
              <label className="col-span-2 flex items-center gap-2 font-sans text-sm text-wood-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleChange('is_active')}
                  className="h-4 w-4 accent-moss-600"
                />
                Livro ativo (visível no catálogo)
              </label>
            )}
          </div>

          {error && <p className="font-sans text-sm font-medium text-terracotta-600">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-wood-200 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting || isUploadingCover}>
              {isUploadingCover ? 'Enviando capa...' : isEditing ? 'Salvar alterações' : 'Cadastrar livro'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
