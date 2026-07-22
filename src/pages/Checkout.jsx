import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, BookOpen, Package, Truck, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { useCartBooksPricing } from '@/hooks/useBooks'
import { useComboPlans } from '@/hooks/usePricing'
import { useCheckout, useComboCheckout } from '@/hooks/useRentals'
import Button from '@/components/ui/Button'
import { formatMoney, cn } from '@/lib/utils'

export default function Checkout() {
  const navigate = useNavigate()
  const { items: cartItems, clear } = useCartStore()
  const { user, profile } = useAuthStore()
  const bookIds = useMemo(() => cartItems.map((i) => i.book_id), [cartItems])
  const { data: books = [], isLoading } = useCartBooksPricing(bookIds)
  const { data: combos = [] } = useComboPlans({ onlyActive: true })

  const [selectedTiers, setSelectedTiers] = useState({}) // { book_id: tier_id }
  const [renewalDays, setRenewalDays] = useState(0)
  const [deliveryMethod, setDeliveryMethod] = useState('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [useCombo, setUseCombo] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const checkout = useCheckout()
  const comboCheckout = useComboCheckout()

  // Combo elegível: algum combo ativo cujo nº de livros bate com o carrinho
  const eligibleCombo = combos.find((c) => c.book_count === books.length)

  // Seleciona automaticamente o tier mais barato de cada livro, pra não
  // deixar o leitor travado sem nada marcado.
  useEffect(() => {
    if (books.length === 0) return
    setSelectedTiers((prev) => {
      const next = { ...prev }
      for (const book of books) {
        if (!next[book.id] && book.pricing_plan?.tiers?.length) {
          next[book.id] = book.pricing_plan.tiers[0].id
        }
      }
      return next
    })
  }, [books])

  if (cartItems.length === 0) {
    return (
      <div className="container-book py-20 text-center">
        <p className="text-cafe mb-4">Sua sacola está vazia.</p>
        <Link to="/acervo" className="text-musgo underline underline-offset-4">
          Explorar acervo
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return <div className="container-book py-20 text-center text-sepia">Carregando…</div>
  }

  const booksWithoutPlan = books.filter((b) => !b.pricing_plan || b.pricing_plan.tiers.length === 0)

  const getTier = (book) => book.pricing_plan?.tiers.find((t) => t.id === selectedTiers[book.id])

  const total = useCombo && eligibleCombo
    ? eligibleCombo.price
    : books.reduce((sum, b) => sum + (getTier(b)?.price || 0), 0)

  const maxDays = useCombo && eligibleCombo
    ? eligibleCombo.days
    : Math.max(0, ...books.map((b) => getTier(b)?.days || 0))

  const handleConfirm = async () => {
    if (!accepted) {
      toast.error('É preciso aceitar o termo de locação.')
      return
    }
    try {
      if (useCombo && eligibleCombo) {
        await comboCheckout.mutateAsync({
          comboPlanId: eligibleCombo.id,
          bookIds,
          termsAccepted: true,
          renewalDays,
          deliveryMethod,
          deliveryAddress,
        })
      } else {
        const items = books.map((b) => ({
          book_id: b.id,
          pricing_tier_id: selectedTiers[b.id],
          renewal_days: renewalDays,
        }))
        await checkout.mutateAsync({
          items,
          termsAccepted: true,
          deliveryMethod,
          deliveryAddress,
        })
      }
      toast.success('Locação registrada!')
      clear()
      navigate('/minha-estante')
    } catch (err) {
      toast.error(err.message || 'Não foi possível concluir a locação.')
    }
  }

  const isPending = checkout.isPending || comboCheckout.isPending

  return (
    <div className="container-book py-12 md:py-16">
      <Link
        to="/acervo"
        className="inline-flex items-center gap-2 text-sm text-cafe/60 hover:text-cafe mb-10 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Continuar navegando
      </Link>

      <div className="mb-10">
        <div className="eyebrow mb-2">Passo final</div>
        <h1 className="font-display text-display-lg">Finalizar locação</h1>
      </div>

      {booksWithoutPlan.length > 0 && (
        <div className="ficha bg-terracota/5 border-terracota/20 mb-8 text-sm text-terracota">
          Os títulos a seguir ainda não têm plano de preço configurado e não podem ser alugados
          agora: {booksWithoutPlan.map((b) => `"${b.title}"`).join(', ')}. Remova-os da sacola ou
          peça pro admin configurar um plano em Planos de Preço.
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_400px] gap-10">
        <div className="space-y-8">
          {/* Opção de combo */}
          {eligibleCombo && (
            <button
              onClick={() => setUseCombo(!useCombo)}
              className={cn(
                'w-full ficha flex items-center gap-4 text-left transition-colors',
                useCombo ? 'bg-musgo/10 border-musgo/30' : 'hover:bg-pergaminho-dark/20',
              )}
            >
              <Package className={cn('w-6 h-6 flex-shrink-0', useCombo ? 'text-musgo' : 'text-sepia')} />
              <div className="flex-1">
                <div className="font-medium text-sm">{eligibleCombo.name}</div>
                <div className="text-xs text-cafe/60">
                  {eligibleCombo.book_count} livros · {eligibleCombo.days} dias · preço fixo de{' '}
                  {formatMoney(eligibleCombo.price)}
                </div>
              </div>
              <div
                className={cn(
                  'w-5 h-5 rounded-full border flex-shrink-0',
                  useCombo ? 'bg-musgo border-musgo' : 'border-sepia/30',
                )}
              />
            </button>
          )}

          {/* Escolha de prazo por livro */}
          {!useCombo && (
            <div className="space-y-4">
              <div className="eyebrow">Escolha o prazo de cada livro</div>
              {books.map((book) => (
                <div key={book.id} className="ficha">
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-14 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sepia/40">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{book.title}</div>
                      <div className="text-xs text-cafe/60">{book.author}</div>
                    </div>
                  </div>

                  {book.pricing_plan?.tiers.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {book.pricing_plan.tiers.map((tier) => {
                        const selected = selectedTiers[book.id] === tier.id
                        return (
                          <button
                            key={tier.id}
                            onClick={() => setSelectedTiers({ ...selectedTiers, [book.id]: tier.id })}
                            className={cn(
                              'px-3 py-2 border text-xs transition-colors',
                              selected
                                ? 'bg-cafe text-pergaminho border-cafe'
                                : 'border-sepia/30 hover:border-cafe',
                            )}
                          >
                            <div className="font-medium">{tier.days} dias</div>
                            <div className="font-mono">{formatMoney(tier.price)}</div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-terracota">Sem plano de preço configurado.</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Renovação */}
          <div className="ficha">
            <div className="eyebrow mb-2">Renovação</div>
            <p className="text-xs text-cafe/60 mb-3 text-pretty">
              Quantos dias a mais você gostaria de ter disponíveis, caso precise renovar mais
              tarde? Fica reservado agora, sem custo — você decide se usa ou não.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={renewalDays}
                onChange={(e) => setRenewalDays(Number(e.target.value))}
                className="input-boxed w-24"
              />
              <span className="text-sm text-cafe/70">dias de renovação</span>
            </div>
          </div>

          {/* Entrega */}
          <div className="ficha">
            <div className="eyebrow mb-3">Retirada ou entrega</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => setDeliveryMethod('pickup')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 border text-sm transition-colors',
                  deliveryMethod === 'pickup'
                    ? 'bg-cafe text-pergaminho border-cafe'
                    : 'border-sepia/30 hover:border-cafe',
                )}
              >
                <Store className="w-4 h-4" /> Retirar na loja
              </button>
              <button
                onClick={() => setDeliveryMethod('delivery')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 border text-sm transition-colors',
                  deliveryMethod === 'delivery'
                    ? 'bg-cafe text-pergaminho border-cafe'
                    : 'border-sepia/30 hover:border-cafe',
                )}
              >
                <Truck className="w-4 h-4" /> Entrega (Breves)
              </button>
            </div>
            {deliveryMethod === 'delivery' && (
              <>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Endereço completo para entrega em Breves…"
                  className="input-boxed resize-none"
                />
                <p className="text-[11px] text-sepia mt-2">
                  O valor da entrega é combinado diretamente com a loja.
                </p>
              </>
            )}
          </div>

          {/* Termo */}
          <article className="ficha p-8 relative">
            <div className="absolute top-4 right-4 opacity-40">
              <ShieldCheck className="w-8 h-8 text-sepia" />
            </div>
            <div className="eyebrow mb-2">Contrato civil de comodato</div>
            <h2 className="font-display text-2xl mb-6">Estante Livre · Termo de Locação</h2>
            <div className="rule-double mb-6" />
            <div className="space-y-4 text-sm leading-relaxed text-cafe/85 text-pretty">
              <p>
                Entre <strong>Estante Livre — Locadora de Livros</strong>, doravante <em>LOCADORA</em>,
                e <strong>{profile?.full_name || user?.email}</strong>, doravante <em>LOCATÁRIO</em>,
                fica pactuado o seguinte:
              </p>
              <p>
                O LOCATÁRIO paga, no ato ou na retirada/entrega, o valor total de{' '}
                <strong>{formatMoney(total)}</strong> referente à locação dos títulos
                selecionados, pelo prazo de <strong>{maxDays} dias</strong> a partir de hoje.
              </p>
              <p>
                Em caso de atraso na devolução, incide multa diária conforme o plano de cada
                livro — podendo ser maior caso outro leitor esteja na fila de espera por aquele
                título no momento do atraso.
              </p>
              <p>
                Em caso de dano leve na capa, extravio ou capa arrancada, aplicam-se as taxas
                vigentes de reparo ou reposição, somadas à multa por atraso, se houver, até a
                quitação total da pendência.
              </p>
              <p>
                O pagamento é combinado diretamente com a locadora no momento da{' '}
                {deliveryMethod === 'delivery' ? 'entrega' : 'retirada'}.
              </p>
            </div>
            <div className="rule-double my-6" />
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 accent-musgo cursor-pointer"
              />
              <span className="text-sm text-cafe leading-relaxed">
                Li e aceito, integralmente, os termos da locação acima.
              </span>
            </label>
          </article>
        </div>

        {/* Resumo */}
        <aside>
          <div className="ficha bg-pergaminho-dark/40 sticky top-24">
            <div className="eyebrow mb-4">Resumo</div>
            <ul className="space-y-2 mb-4 text-sm">
              {books.map((b) => (
                <li key={b.id} className="flex justify-between">
                  <span className="truncate pr-2">{b.title}</span>
                  <span className="font-mono flex-shrink-0">
                    {useCombo ? '—' : formatMoney(getTier(b)?.price || 0)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="rule-double mb-4" />
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Prazo</span>
              <span className="font-mono text-sm">{maxDays} dias</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Total</span>
              <span className="font-mono text-xl text-musgo">{formatMoney(total)}</span>
            </div>
            <Button
              onClick={handleConfirm}
              loading={isPending}
              disabled={!accepted || booksWithoutPlan.length > 0}
              className="w-full"
            >
              Confirmar locação
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
