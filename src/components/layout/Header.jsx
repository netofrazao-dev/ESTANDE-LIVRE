import { Link, NavLink } from 'react-router-dom'
import { ShoppingBag, User, LogOut, Menu, X, Shield, BookMarked } from 'lucide-react'
import { useState } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const cartCount = useCartStore((s) => s.count())
  const openCart = useCartStore((s) => s.open)
  const { user, profile, signOut, isAdmin } = useAuthStore()

  const navLinkClass = ({ isActive }) =>
    cn(
      'text-sm font-medium transition-colors',
      isActive ? 'text-cafe' : 'text-cafe/60 hover:text-cafe',
    )

  return (
    <header className="sticky top-0 z-40 bg-pergaminho/95 backdrop-blur border-b border-sepia/15">
      <div className="container-book flex items-center justify-between py-5">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2">
          <div className="relative">
            <BookMarked className="w-6 h-6 text-cafe group-hover:text-musgo transition-colors" />
          </div>
          <div>
            <div className="font-display text-xl leading-none text-cafe">Estande Livre</div>
            <div className="eyebrow mt-0.5">Locadora · desde 2026</div>
          </div>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/" end className={navLinkClass}>Início</NavLink>
          <NavLink to="/acervo" className={navLinkClass}>Acervo</NavLink>
          {user && (
            <NavLink to="/minha-estante" className={navLinkClass}>Minha estante</NavLink>
          )}
          {isAdmin() && (
            <NavLink to="/admin" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Backoffice
              </span>
            </NavLink>
          )}
        </nav>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/minha-conta" className="text-right hover:opacity-70 transition-opacity">
                <div className="text-xs text-cafe font-medium">
                  {profile?.full_name?.split(' ')[0] || 'Leitor'}
                </div>
                <div className="text-[10px] text-sepia">{profile?.email || user.email}</div>
              </Link>
              <button
                onClick={signOut}
                className="p-2 text-cafe/60 hover:text-terracota transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/entrar"
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-cafe hover:text-musgo transition-colors"
            >
              <User className="w-4 h-4" /> Entrar
            </Link>
          )}

          <button
            onClick={openCart}
            className="relative p-2 text-cafe hover:text-musgo transition-colors"
            aria-label="Abrir sacola de leitura"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-terracota text-pergaminho text-[10px] font-mono rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-cafe"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-sepia/15 bg-pergaminho">
          <nav className="container-book flex flex-col py-4 gap-3">
            <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>Início</NavLink>
            <NavLink to="/acervo" className={navLinkClass} onClick={() => setMobileOpen(false)}>Acervo</NavLink>
            {user && (
              <NavLink to="/minha-estante" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                Minha estante
              </NavLink>
            )}
            {isAdmin() && (
              <NavLink to="/admin" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                Backoffice
              </NavLink>
            )}
            <div className="pt-3 border-t border-sepia/15">
              {user ? (
                <div className="flex flex-col gap-3">
                  <Link to="/minha-conta" className="text-sm text-cafe" onClick={() => setMobileOpen(false)}>
                    Minha conta
                  </Link>
                  <button onClick={signOut} className="text-sm text-terracota text-left">Sair</button>
                </div>
              ) : (
                <Link to="/entrar" className="text-sm text-cafe" onClick={() => setMobileOpen(false)}>
                  Entrar
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
