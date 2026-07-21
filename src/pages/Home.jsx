import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Clock, Shield } from 'lucide-react'
import { useFeaturedBooks, useNewArrivals, useCategories } from '@/hooks/useBooks'
import { useSettingsStore } from '@/stores/settingsStore'
import BookGrid from '@/components/books/BookGrid'
import Button from '@/components/ui/Button'

export default function Home() {
  const { data: featured = [], isLoading: loadingFeatured } = useFeaturedBooks()
  const { data: recent = [], isLoading: loadingRecent } = useNewArrivals()
  const { data: categories = [] } = useCategories()
  const { maxBooksPerRental, rentalDays, dailyFine } = useSettingsStore()

  return (
    <>
      {/* Hero */}
      <section className="container-book pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="grid md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="eyebrow mb-6">Locadora de livros · fundada em 2026</div>
              <h1 className="font-display text-display-lg md:text-display-xl text-balance leading-[1.02]">
                Uma estante inteira,
                <br />
                <span className="italic text-musgo">à sua espera.</span>
              </h1>
              <p className="mt-8 text-lg text-cafe/70 max-w-xl text-pretty">
                Escolha até {maxBooksPerRental} livros por vez, leia com calma por
                {' '}{rentalDays} dias, devolva quando terminar. Sem pressa, sem estoque em casa.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/acervo">
                  <Button size="lg">
                    Explorar acervo <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/cadastrar">
                  <Button variant="secondary" size="lg">
                    Criar cadastro
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Ficha lateral — signature element */}
          <div className="md:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="ficha space-y-3"
            >
              <div className="eyebrow">Ficha da locadora</div>
              <div className="rule-double" />
              <dl className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <dt className="text-sepia">Prazo padrão</dt>
                  <dd className="tabular-nums">{rentalDays} dias</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sepia">Livros/locação</dt>
                  <dd className="tabular-nums">até {maxBooksPerRental}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sepia">Multa por atraso</dt>
                  <dd className="tabular-nums">R$ {dailyFine.toFixed(2).replace('.', ',')}/dia</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sepia">Retirada</dt>
                  <dd>presencial</dd>
                </div>
              </dl>
              <div className="rule-double" />
              <div className="text-[10px] text-sepia/70 pt-1 leading-relaxed">
                Todo aluguel é firmado por termo digital, com aceite registrado no ato do checkout.
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-y border-sepia/15 bg-pergaminho-dark/20">
        <div className="container-book py-16 grid md:grid-cols-3 gap-10">
          {[
            {
              icon: BookOpen,
              step: '01',
              title: 'Escolha',
              text: `Navegue pelo acervo e adicione até ${maxBooksPerRental} títulos à sua sacola de leitura.`,
            },
            {
              icon: Shield,
              step: '02',
              title: 'Assine o termo',
              text: 'No checkout, você aceita o termo de locação — as regras do contrato, todas em uma tela.',
            },
            {
              icon: Clock,
              step: '03',
              title: 'Leia com calma',
              text: `Tem ${rentalDays} dias para devolver. Passou disso, multa diária começa a correr.`,
            },
          ].map((item) => (
            <div key={item.step}>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-mono text-xs text-sepia tracking-widest">{item.step}</span>
                <div className="flex-1 h-px bg-sepia/20" />
                <item.icon className="w-4 h-4 text-sepia" />
              </div>
              <h3 className="font-display text-2xl mb-3">{item.title}</h3>
              <p className="text-sm text-cafe/70 text-pretty">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Destaques */}
      <section className="container-book py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="eyebrow mb-2">Destaques da estante</div>
            <h2 className="font-display text-display-md">Escolhas do bibliotecário</h2>
          </div>
          <Link
            to="/acervo"
            className="hidden md:inline-flex items-center gap-1 text-sm text-cafe hover:text-musgo transition-colors"
          >
            Ver acervo completo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <BookGrid books={featured} loading={loadingFeatured} />
      </section>

      {/* Recém-chegados */}
      <section className="container-book py-20 border-t border-sepia/15">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="eyebrow mb-2">Últimas semanas</div>
            <h2 className="font-display text-display-md">Recém-chegados</h2>
          </div>
        </div>
        <BookGrid
          books={recent}
          loading={loadingRecent}
          isNewFn={(b) => {
            const days = (Date.now() - new Date(b.created_at)) / (1000 * 60 * 60 * 24)
            return days <= 14
          }}
        />
      </section>

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="container-book py-20 border-t border-sepia/15">
          <div className="eyebrow mb-2">Por seção</div>
          <h2 className="font-display text-display-md mb-10">Categorias do acervo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((c, i) => (
              <Link
                key={c.id}
                to={`/acervo?categoria=${c.slug}`}
                className="ficha hover:bg-pergaminho-dark/30 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] text-sepia mb-1">
                      № {String(i + 1).padStart(3, '0')}
                    </div>
                    <div className="font-display text-lg text-cafe group-hover:text-musgo transition-colors">
                      {c.name}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-sepia group-hover:text-musgo group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
