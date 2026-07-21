import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCheckout } from '@/hooks/useRentals'
import Button from '@/components/ui/Button'
import { formatDatador, previewDueDate, formatMoney } from '@/lib/utils'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, clear } = useCartStore()
  const { user, profile } = useAuthStore()
  const { rentalDays, dailyFine, damageFee, lossFee } = useSettingsStore()
  const [accepted, setAccepted] = useState(false)
  const checkout = useCheckout()

  const dueDate = previewDueDate(rentalDays)

  if (items.length === 0) {
    return (
      <div className="container-book py-20 text-center">
        <p className="text-cafe mb-4">Sua sacola está vazia.</p>
        <Link to="/acervo" className="text-musgo underline underline-offset-4">
          Explorar acervo
        </Link>
      </div>
    )
  }

  const handleConfirm = async () => {
    if (!accepted) {
      toast.error('É preciso aceitar o termo de locação.')
      return
    }
    try {
      await checkout.mutateAsync({
        bookIds: items.map((i) => i.book_id),
        termsAccepted: true,
      })
      toast.success('Locação registrada! Passe na loja para retirar.')
      clear()
      navigate('/minha-estante')
    } catch (err) {
      toast.error(err.message || 'Não foi possível concluir a locação.')
    }
  }

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
        <h1 className="font-display text-display-lg">Termo de locação</h1>
      </div>

      <div className="grid md:grid-cols-[1fr_400px] gap-10">
        {/* Termo */}
        <div>
          <article className="ficha p-8 md:p-10 bg-pergaminho-dark/20 relative">
            <div className="absolute top-4 right-4 opacity-40">
              <ShieldCheck className="w-8 h-8 text-sepia" />
            </div>

            <div className="eyebrow mb-2">Contrato civil de comodato</div>
            <h2 className="font-display text-2xl mb-6">Estande Livre · Termo de Locação</h2>

            <div className="rule-double mb-6" />

            <div className="space-y-5 text-sm leading-relaxed text-cafe/85 text-pretty">
              <p>
                Entre <strong className="font-semibold text-cafe">Estande Livre — Locadora de Livros</strong>,
                doravante denominada <em>LOCADORA</em>, e{' '}
                <strong className="font-semibold text-cafe">{profile?.full_name || user?.email}</strong>,
                doravante <em>LOCATÁRIO</em>, fica pactuado o seguinte:
              </p>

              <div>
                <div className="eyebrow mb-2">Cláusula 1ª — Do objeto</div>
                <p>
                  O LOCATÁRIO recebe, sob comodato, os títulos listados nesta locação,
                  comprometendo-se a devolvê-los em iguais condições ao término do prazo.
                </p>
              </div>

              <div>
                <div className="eyebrow mb-2">Cláusula 2ª — Do prazo</div>
                <p>
                  O prazo de comodato é de <strong>{rentalDays} dias corridos</strong>,
                  contados desta data. A data-limite fica então definida como{' '}
                  <strong className="font-mono">{formatDatador(dueDate)}</strong>.
                </p>
              </div>

              <div>
                <div className="eyebrow mb-2">Cláusula 3ª — Da conservação</div>
                <p>
                  O LOCATÁRIO obriga-se a zelar pela integridade das obras, evitando escrever,
                  sublinhar, dobrar páginas, expor a umidade, calor excessivo ou animais.
                  Não é permitida a cessão a terceiros.
                </p>
              </div>

              <div>
                <div className="eyebrow mb-2">Cláusula 4ª — Das penalidades</div>
                <p>
                  Em caso de atraso, incidirá multa diária de{' '}
                  <strong>{formatMoney(dailyFine)}</strong> por título, contada a partir do
                  primeiro dia após o vencimento. Livros devolvidos com dano ficam sujeitos à taxa
                  de reparo de {formatMoney(damageFee)}. Extravio implica reposição
                  integral, no valor de {formatMoney(lossFee)}.
                </p>
              </div>

              <div>
                <div className="eyebrow mb-2">Cláusula 5ª — Do aceite</div>
                <p>
                  O aceite eletrônico deste termo, registrado com carimbo de data e hora,
                  tem valor de assinatura para todos os efeitos legais.
                </p>
              </div>
            </div>

            <div className="rule-double my-6" />

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 accent-musgo cursor-pointer"
              />
              <span className="text-sm text-cafe leading-relaxed">
                Li e aceito, integralmente e sem reservas, os termos da locação acima.
                Concordo em devolver os títulos até{' '}
                <strong className="font-mono">{formatDatador(dueDate)}</strong> e assumo
                as penalidades em caso de atraso ou dano.
              </span>
            </label>
          </article>
        </div>

        {/* Resumo */}
        <aside className="space-y-6">
          <div className="ficha bg-pergaminho-dark/40 sticky top-24">
            <div className="eyebrow mb-4">Livros nesta locação</div>

            <ul className="space-y-3 mb-6">
              {items.map((item, i) => (
                <li key={item.book_id} className="flex gap-3 items-start">
                  <span className="font-mono text-[10px] text-sepia mt-0.5 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="w-10 h-14 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sepia/40">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight line-clamp-2">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-cafe/60 mt-0.5">{item.author}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rule-double mb-4" />

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-sepia">Livros</dt>
                <dd className="font-mono tabular-nums">{items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sepia">Retirada</dt>
                <dd className="font-mono">hoje</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sepia">Devolução</dt>
                <dd className="font-mono tabular-nums text-xs">{formatDatador(dueDate)}</dd>
              </div>
            </dl>

            <Button
              onClick={handleConfirm}
              loading={checkout.isPending}
              disabled={!accepted}
              className="w-full mt-6"
            >
              Confirmar locação
            </Button>

            <p className="text-[11px] text-sepia/70 mt-3 text-center">
              O aceite gera um registro com data e hora no banco.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
