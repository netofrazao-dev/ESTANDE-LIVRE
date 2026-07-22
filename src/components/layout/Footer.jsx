import { Link } from 'react-router-dom'
import { BookMarked, MapPin, Phone, Clock3, MessageCircle, Instagram } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { waLink } from '@/lib/utils'

export default function Footer() {
  const { storeName, storeAddress, storePhone, storeHours, whatsappNumber, instagramUrl } = useSettingsStore()
  const whatsapp = waLink(whatsappNumber, `Olá! Vim pelo site da ${storeName} e queria tirar uma dúvida.`)

  return (
    <footer className="border-t border-sepia/15 bg-pergaminho-dark/30 mt-24">
      <div className="container-book py-16">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Marca */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <BookMarked className="w-5 h-5 text-cafe" />
              <span className="font-display text-xl">{storeName}</span>
            </div>
            <p className="text-sm text-cafe/70 max-w-sm text-pretty mb-4">
              Uma locadora de livros pensada para quem trata a leitura como um encontro,
              e não como um consumo apressado.
            </p>
            <div className="flex items-center gap-3">
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-musgo hover:underline underline-offset-4"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-musgo hover:underline underline-offset-4"
                >
                  <Instagram className="w-3.5 h-3.5" /> Instagram
                </a>
              )}
            </div>
          </div>

          {/* Navegar */}
          <div>
            <h4 className="eyebrow mb-4">Navegar</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-cafe/70 hover:text-cafe">Início</Link></li>
              <li><Link to="/acervo" className="text-cafe/70 hover:text-cafe">Acervo</Link></li>
              <li><Link to="/minha-estante" className="text-cafe/70 hover:text-cafe">Minha estante</Link></li>
              <li><Link to="/entrar" className="text-cafe/70 hover:text-cafe">Entrar</Link></li>
              <li><Link to="/privacidade" className="text-cafe/70 hover:text-cafe">Política de Privacidade</Link></li>
            </ul>
          </div>

          {/* Retirada */}
          <div>
            <h4 className="eyebrow mb-4">Retirada</h4>
            <ul className="space-y-2 text-sm text-cafe/70">
              {storeAddress && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {storeAddress}
                </li>
              )}
              {storePhone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {storePhone}
                </li>
              )}
              {storeHours && (
                <li className="flex items-center gap-2">
                  <Clock3 className="w-3.5 h-3.5 flex-shrink-0" /> {storeHours}
                </li>
              )}
              {!storeAddress && !storePhone && !storeHours && (
                <li className="text-cafe/40 text-xs">
                  Configure em /admin/configuracoes
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-12 pt-6 border-t border-sepia/15 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-sepia">
          <div className="font-mono">
            © {new Date().getFullYear()} · {storeName} · Todos os direitos reservados
          </div>
          <div className="font-mono">
            Feito à mão, com café, por leitores.
          </div>
        </div>
      </div>
    </footer>
  )
}
