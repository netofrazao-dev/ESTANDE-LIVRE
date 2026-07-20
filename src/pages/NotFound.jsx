import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="container-book py-24 md:py-32 text-center">
      <div className="font-mono text-xs text-sepia tracking-widest mb-4">
        ERR · 404 · ITEM NÃO CATALOGADO
      </div>
      <h1 className="font-display text-display-lg mb-6">
        Esta página não está na estante.
      </h1>
      <p className="text-cafe/70 max-w-md mx-auto mb-10 text-pretty">
        O bibliotecário procurou nas fichas e não encontrou nada com este endereço.
        Talvez seja um erro de digitação — ou o livro foi arquivado.
      </p>
      <Link to="/">
        <Button>Voltar ao início</Button>
      </Link>
    </div>
  )
}
