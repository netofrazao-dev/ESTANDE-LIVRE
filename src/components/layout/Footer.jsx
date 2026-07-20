import { Link } from 'react-router-dom'
import { BookMarked, Instagram, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-sepia/15 bg-pergaminho-dark/30 mt-24">
      <div className="container-book py-16">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Marca */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <BookMarked className="w-5 h-5 text-cafe" />
              <span className="font-display text-xl">Estande Livre</span>
            </div>
            <p className="text-sm text-cafe/70 max-w-sm text-pretty">
              Uma locadora de livros pensada para quem trata a leitura como um encontro,
              e não como um consumo apressado.
            </p>
          </div>

          {/* Navegar */}
          <div>
            <h4 className="eyebrow mb-4">Navegar</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-cafe/70 hover:text-cafe">Início</Link></li>
              <li><Link to="/acervo" className="text-cafe/70 hover:text-cafe">Acervo</Link></li>
              <li><Link to="/minha-estante" className="text-cafe/70 hover:text-cafe">Minha estante</Link></li>
              <li><Link to="/entrar" className="text-cafe/70 hover:text-cafe">Entrar</Link></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="eyebrow mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-cafe/70">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> contato@estandelivre.com.br
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5" /> @estandelivre
              </li>
            </ul>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-12 pt-6 border-t border-sepia/15 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-sepia">
          <div className="font-mono">
            © {new Date().getFullYear()} · Estande Livre · Todos os direitos reservados
          </div>
          <div className="font-mono">
            Feito à mão, com café, por leitores.
          </div>
        </div>
      </div>
    </footer>
  )
}
