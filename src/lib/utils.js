import { clsx } from 'clsx'
import { format, differenceInCalendarDays, addDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const cn = (...classes) => clsx(classes)

// ── Config da locadora ────────────────────────────────────────────
export const RENTAL_CONFIG = {
  maxBooksPerRental: Number(import.meta.env.VITE_MAX_BOOKS_PER_RENTAL) || 3,
  rentalDays: Number(import.meta.env.VITE_RENTAL_DAYS) || 14,
  dailyFine: Number(import.meta.env.VITE_DAILY_FINE) || 2.0,
  damageFee: 50.0,
  lossFee: 150.0,
}

// ── Formatação de data ────────────────────────────────────────────
export const formatDate = (date, pattern = 'dd/MM/yyyy') => {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: ptBR })
}

// Data em formato de datador de biblioteca: "12 · MAI · 2026"
export const formatDatador = (date) => {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  const day = format(d, 'dd')
  const month = format(d, 'MMM', { locale: ptBR }).replace('.', '').toUpperCase()
  const year = format(d, 'yyyy')
  return `${day} · ${month} · ${year}`
}

// ── Moeda ─────────────────────────────────────────────────────────
export const formatMoney = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)

// ── Cálculo de multas ─────────────────────────────────────────────
/**
 * Calcula a multa acumulada até hoje para um aluguel em atraso.
 * @param {string|Date} dueDate — data limite de devolução
 * @param {string|Date} referenceDate — data de referência (default: hoje)
 * @param {number} dailyRate — taxa diária a aplicar. IMPORTANTE: para
 *   locações já existentes, sempre passe o valor congelado da própria
 *   linha (`rental.daily_fine_rate`), não a configuração atual — senão
 *   uma mudança de preço no admin passaria a valer retroativamente.
 * @returns {{ daysLate: number, amount: number, isLate: boolean }}
 */
export const calculateFine = (dueDate, referenceDate = new Date(), dailyRate = RENTAL_CONFIG.dailyFine) => {
  if (!dueDate) return { daysLate: 0, amount: 0, isLate: false }
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  const ref = typeof referenceDate === 'string' ? parseISO(referenceDate) : referenceDate
  const daysLate = differenceInCalendarDays(ref, due)
  if (daysLate <= 0) return { daysLate: 0, amount: 0, isLate: false }
  return {
    daysLate,
    amount: daysLate * dailyRate,
    isLate: true,
  }
}

// Dias restantes até a devolução (positivo = ainda no prazo, negativo = atrasado)
export const daysUntilDue = (dueDate) => {
  if (!dueDate) return 0
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  return differenceInCalendarDays(due, new Date())
}

/**
 * Calcula a multa de uma locação, escolhendo automaticamente entre a taxa
 * normal e a taxa "reservado" (quando há fila de espera ativa pro livro),
 * e respeitando o congelamento de status danificado/perdido ainda não
 * resolvido (a multa continua contando até hoje enquanto não for pago).
 *
 * @param {object} rental — linha de rentals (precisa de due_date, status,
 *   daily_fine_normal, daily_fine_reserved, fine_used_reserved_rate,
 *   late_fee, resolved_at, returned_at)
 * @param {boolean} hasActiveReservation — só é usado quando status='active'
 */
export const computeRentalFine = (rental, hasActiveReservation = false) => {
  if (!rental?.due_date) return { daysLate: 0, amount: 0, isLate: false }
  const due = typeof rental.due_date === 'string' ? parseISO(rental.due_date) : rental.due_date

  // Devolvido limpo: valor já congelado no momento da devolução.
  if (rental.status === 'returned') {
    const amount = rental.late_fee || 0
    return {
      daysLate: rental.returned_at ? Math.max(0, differenceInCalendarDays(parseISO(rental.returned_at), due)) : 0,
      amount,
      isLate: amount > 0,
    }
  }

  // Danificado/perdido: se já resolvido (pago), valor travado; senão,
  // continua contando até hoje.
  if (rental.status === 'damaged' || rental.status === 'lost') {
    if (rental.resolved_at) {
      const amount = rental.late_fee || 0
      return {
        daysLate: Math.max(0, differenceInCalendarDays(parseISO(rental.resolved_at), due)),
        amount,
        isLate: amount > 0,
      }
    }
    const rate = rental.fine_used_reserved_rate
      ? (rental.daily_fine_reserved ?? rental.daily_fine_rate ?? RENTAL_CONFIG.dailyFine)
      : (rental.daily_fine_normal ?? rental.daily_fine_rate ?? RENTAL_CONFIG.dailyFine)
    return calculateFine(due, new Date(), rate)
  }

  // Ativo: calcula ao vivo, escolhendo a taxa conforme reserva atual.
  const rate = hasActiveReservation
    ? (rental.daily_fine_reserved ?? rental.daily_fine_rate ?? RENTAL_CONFIG.dailyFine)
    : (rental.daily_fine_normal ?? rental.daily_fine_rate ?? RENTAL_CONFIG.dailyFine)
  return calculateFine(due, new Date(), rate)
}

// Prevê data de devolução a partir de hoje
export const previewDueDate = (rentalDays = RENTAL_CONFIG.rentalDays) => {
  return addDays(new Date(), rentalDays)
}

// ── Slug ──────────────────────────────────────────────────────────
export const slugify = (text) =>
  (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

// ── Status humano ─────────────────────────────────────────────────
export const rentalStatusLabel = (status) => {
  const map = {
    active: 'Em curso',
    late: 'Atrasado',
    returned: 'Devolvido',
    damaged: 'Devolvido com dano',
    lost: 'Extraviado',
  }
  return map[status] || status
}

// ── Truncate ──────────────────────────────────────────────────────
export const truncate = (str, len = 120) =>
  str && str.length > len ? str.slice(0, len).trimEnd() + '…' : str
