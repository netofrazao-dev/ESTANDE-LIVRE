import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, UserPlus, BookOpen, X, Check, ArrowLeft } from 'lucide-react'
import { useReaders, useAdminCheckout, useCreateReaderByAdmin } from '@/hooks/useRentals'
import { useBooks } from '@/hooks/useBooks'
import { useSettingsStore } from '@/stores/settingsStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export default function AdminNewRental() {
  const [step, setStep] = useState(1) // 1: leitor, 2: livros, 3: confirmação
  const [reader, setReader] = useState(null)
  const [selectedBooks, setSelectedBooks] = useState([])

  const reset = () => {
    setStep(1)
    setReader(null)
    setSelectedBooks([])
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="eyebrow mb-2">Balcão</div>
        <h1 className="font-display text-display-md">Nova locação</h1>
        <p className="text-sm text-cafe/70 mt-2 text-pretty">
          Para quem entrou na loja e vai levar o livro sem ter usado o site.
        </p>
      </div>

      {/* Progresso */}
      <div className="flex items-center gap-2 mb-10">
        {[
          { n: 1, label: 'Leitor' },
          { n: 2, label: 'Livros' },
          { n: 3, label: 'Confirmar' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0',
                step === s.n
                  ? 'bg-musgo text-pergaminho'
                  : step > s.n
                    ? 'bg-musgo/20 text-musgo'
                    : 'bg-sepia/10 text-sepia',
              )}
            >
              {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className={cn('text-xs', step === s.n ? 'text-cafe font-medium' : 'text-sepia')}>
              {s.label}
            </span>
            {i < 2 && <div className="w-8 h-px bg-sepia/20 mx-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <StepReader
          onSelect={(r) => {
            setReader(r)
            setStep(2)
          }}
        />
      )}

      {step === 2 && reader && (
        <StepBooks
          reader={reader}
          selectedBooks={selectedBooks}
          setSelectedBooks={setSelectedBooks}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && reader && (
        <StepConfirm
          reader={reader}
          selectedBooks={selectedBooks}
          onBack={() => setStep(2)}
          onDone={reset}
        />
      )}
    </div>
  )
}

// ── Passo 1: buscar ou criar leitor ────────────────────────────────
function StepReader({ onSelect }) {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newReader, setNewReader] = useState({ fullName: '', email: '', phone: '' })
  const { data: readers = [], isLoading } = useReaders(search)
  const createReader = useCreateReaderByAdmin()

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const result = await createReader.mutateAsync(newReader)
      toast.success('Leitor cadastrado.')
      onSelect({ id: result.id, full_name: newReader.fullName, email: newReader.email })
    } catch (err) {
      toast.error(err.message || 'Não foi possível cadastrar.')
    }
  }

  if (creating) {
    return (
      <div className="ficha">
        <h2 className="font-display text-xl mb-4">Cadastrar novo leitor</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome completo"
            value={newReader.fullName}
            onChange={(e) => setNewReader({ ...newReader, fullName: e.target.value })}
            required
            autoFocus
          />
          <Input
            label="E-mail"
            type="email"
            value={newReader.email}
            onChange={(e) => setNewReader({ ...newReader, email: e.target.value })}
            required
          />
          <Input
            label="Telefone (opcional)"
            value={newReader.phone}
            onChange={(e) => setNewReader({ ...newReader, phone: e.target.value })}
          />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Voltar à busca
            </Button>
            <Button type="submit" loading={createReader.isPending}>
              Cadastrar e continuar
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar leitor já cadastrado, por nome ou e-mail…"
          className="input-boxed pl-10"
          autoFocus
        />
      </div>

      <button
        onClick={() => setCreating(true)}
        className="w-full flex items-center gap-3 p-4 border border-dashed border-sepia/30 hover:border-musgo hover:bg-musgo/5 transition-colors mb-4 text-left"
      >
        <UserPlus className="w-5 h-5 text-musgo flex-shrink-0" />
        <div>
          <div className="text-sm font-medium">Cadastrar novo leitor</div>
          <div className="text-xs text-cafe/60">Alguém que nunca alugou aqui antes</div>
        </div>
      </button>

      {search && (
        <div className="border border-sepia/15 bg-pergaminho divide-y divide-sepia/10">
          {isLoading ? (
            <div className="text-center py-6 text-sepia text-sm">Buscando…</div>
          ) : readers.length === 0 ? (
            <div className="text-center py-6 text-sepia text-sm">Nenhum leitor encontrado.</div>
          ) : (
            readers.slice(0, 8).map((r) => (
              <button
                key={r.id}
                onClick={() => onSelect(r)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pergaminho-dark/20 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.full_name}</div>
                  <div className="text-xs text-cafe/60">{r.email}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Passo 2: escolher livros ───────────────────────────────────────
function StepBooks({ reader, selectedBooks, setSelectedBooks, onBack, onNext }) {
  const [search, setSearch] = useState('')
  const { data: books = [], isLoading } = useBooks({ search })
  const maxBooks = useSettingsStore((s) => s.maxBooksPerRental)

  const available = books.filter((b) => (b.available_copies || 0) > 0)

  const toggle = (book) => {
    if (selectedBooks.find((b) => b.id === book.id)) {
      setSelectedBooks(selectedBooks.filter((b) => b.id !== book.id))
    } else {
      if (selectedBooks.length >= maxBooks) {
        toast.error(`Limite de ${maxBooks} livros por locação.`)
        return
      }
      setSelectedBooks([...selectedBooks, book])
    }
  }

  return (
    <div>
      <div className="ficha bg-pergaminho-dark/30 mb-6 flex items-center justify-between">
        <div>
          <div className="eyebrow mb-1">Leitor</div>
          <div className="font-medium">{reader.full_name}</div>
        </div>
        <button onClick={onBack} className="text-xs text-sepia hover:text-cafe underline underline-offset-4">
          Trocar
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar livro por título ou autor…"
          className="input-boxed pl-10"
          autoFocus
        />
      </div>

      <div className="text-xs text-sepia mb-3">
        {selectedBooks.length} de {maxBooks} selecionado{selectedBooks.length === 1 ? '' : 's'}
      </div>

      <div className="border border-sepia/15 bg-pergaminho divide-y divide-sepia/10 max-h-[420px] overflow-y-auto mb-6">
        {isLoading ? (
          <div className="text-center py-6 text-sepia text-sm">Carregando…</div>
        ) : available.length === 0 ? (
          <div className="text-center py-6 text-sepia text-sm">Nenhum livro disponível encontrado.</div>
        ) : (
          available.map((book) => {
            const checked = selectedBooks.some((b) => b.id === book.id)
            return (
              <button
                key={book.id}
                onClick={() => toggle(book)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
                  checked ? 'bg-musgo/10' : 'hover:bg-pergaminho-dark/20',
                )}
              >
                <div className="w-8 h-11 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sepia/40">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{book.title}</div>
                  <div className="text-xs text-cafe/60">{book.author}</div>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0',
                    checked ? 'bg-musgo border-musgo' : 'border-sepia/30',
                  )}
                >
                  {checked && <Check className="w-3 h-3 text-pergaminho" />}
                </div>
              </button>
            )
          })
        )}
      </div>

      <Button onClick={onNext} disabled={selectedBooks.length === 0} className="w-full">
        Continuar
      </Button>
    </div>
  )
}

// ── Passo 3: confirmar ──────────────────────────────────────────────
function StepConfirm({ reader, selectedBooks, onBack, onDone }) {
  const adminCheckout = useAdminCheckout()
  const { rentalDays, dailyFine } = useSettingsStore()

  const handleConfirm = async () => {
    try {
      await adminCheckout.mutateAsync({
        targetUserId: reader.id,
        bookIds: selectedBooks.map((b) => b.id),
      })
      toast.success(`Locação registrada para ${reader.full_name}.`)
      onDone()
    } catch (err) {
      toast.error(err.message || 'Não foi possível registrar a locação.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="ficha bg-pergaminho-dark/30">
        <div className="eyebrow mb-1">Leitor</div>
        <div className="font-medium">{reader.full_name}</div>
        <div className="text-xs text-cafe/60">{reader.email}</div>
      </div>

      <div>
        <div className="eyebrow mb-3">Livros ({selectedBooks.length})</div>
        <ul className="space-y-2">
          {selectedBooks.map((book) => (
            <li key={book.id} className="flex items-center gap-3 px-4 py-2 bg-pergaminho-dark/20">
              <span className="text-sm font-medium flex-1">{book.title}</span>
              <span className="text-xs text-cafe/60">{book.author}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="ficha bg-musgo/5 border-musgo/20 text-sm text-cafe/80">
        Prazo de <strong>{rentalDays} dias</strong>, multa diária de{' '}
        <strong>R$ {dailyFine.toFixed(2).replace('.', ',')}</strong> em caso de atraso. Ao
        confirmar, considera-se que o termo de locação foi explicado e aceito presencialmente.
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={handleConfirm} loading={adminCheckout.isPending} className="flex-1">
          Confirmar locação
        </Button>
      </div>
    </div>
  )
}
