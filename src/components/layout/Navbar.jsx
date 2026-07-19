import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore, selectCartCount } from '../../store/useCartStore';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsAdmin,
  selectDisplayName,
} from '../../store/useAuthStore';
import { signOut } from '../../services/auth.service';

export default function Navbar({ onSearch }) {
  const [searchValue, setSearchValue] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartCount = useCartStore(selectCartCount);
  const toggleCart = useCartStore((state) => state.toggleCart);

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isAdmin = useAuthStore(selectIsAdmin);
  const displayName = useAuthStore(selectDisplayName);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(searchValue.trim());
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-wood-200/70 bg-parchment/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4 md:gap-6 md:px-12">
        {/* Logo */}
        <Link to="/" className="group flex shrink-0 items-center gap-2">
          <svg
            className="h-7 w-7 text-moss-700 transition-transform duration-300 group-hover:-rotate-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.6}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          <span className="font-serif text-xl font-bold tracking-tight text-wood-800">
            Estante Livre
          </span>
        </Link>

        {/* Busca — desktop */}
        <form onSubmit={handleSubmit} className="relative hidden max-w-md flex-1 sm:block">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-wood-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar por título ou autor..."
            className="
              w-full rounded-full border border-wood-200 bg-parchment-light py-2.5 pl-10 pr-4
              font-sans text-sm text-wood-800 placeholder:text-wood-400
              shadow-inner transition-all duration-300
              focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200
            "
          />
        </form>

        <div className="flex-1 sm:hidden" />

        {/* Conta — desktop */}
        <nav className="hidden shrink-0 items-center gap-3 font-sans text-sm sm:flex">
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-full border border-wood-300 px-3.5 py-1.5 font-semibold text-wood-700 transition-colors duration-300 hover:bg-wood-100"
            >
              Admin
            </Link>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/minha-conta"
                className="font-semibold text-wood-700 transition-colors duration-300 hover:text-moss-700"
              >
                Olá, {displayName}
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-xs text-wood-400 transition-colors duration-300 hover:text-terracotta-600"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              to="/entrar"
              className="font-semibold text-wood-700 transition-colors duration-300 hover:text-moss-700"
            >
              Entrar
            </Link>
          )}
        </nav>

        {/* Sacola */}
        <button
          type="button"
          onClick={toggleCart}
          aria-label="Abrir sacola de leitura"
          className="
            relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full
            text-wood-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-wood-100
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500
          "
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 8.25V6a4.5 4.5 0 10-9 0v2.25M4.5 8.25h15l-1.05 11.55a1.5 1.5 0 01-1.494 1.35H7.044a1.5 1.5 0 01-1.494-1.35L4.5 8.25z"
            />
          </svg>

          {cartCount > 0 && (
            <span
              className="
                absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center
                rounded-full bg-terracotta-500 font-sans text-[11px] font-bold text-parchment
                ring-2 ring-parchment
              "
            >
              {cartCount}
            </span>
          )}
        </button>

        {/* Botão hambúrguer — só em telas pequenas */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isMobileMenuOpen}
          className="
            flex h-11 w-11 shrink-0 items-center justify-center rounded-full
            text-wood-700 transition-colors duration-300 hover:bg-wood-100 sm:hidden
          "
        >
          {isMobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Menu mobile — busca + conta + admin, tudo que some no desktop nav */}
      {isMobileMenuOpen && (
        <div className="border-t border-wood-200/70 bg-parchment px-6 py-4 sm:hidden">
          <form onSubmit={handleSubmit} className="relative mb-4">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-wood-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar por título ou autor..."
              className="
                w-full rounded-full border border-wood-200 bg-parchment-light py-2.5 pl-10 pr-4
                font-sans text-sm text-wood-800 placeholder:text-wood-400
                shadow-inner focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200
              "
            />
          </form>

          <div className="flex flex-col gap-1 font-sans text-sm">
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-sm px-3 py-2.5 font-semibold text-wood-700 hover:bg-wood-100"
              >
                Painel Admin
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <Link
                  to="/minha-conta"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-sm px-3 py-2.5 font-semibold text-wood-700 hover:bg-wood-100"
                >
                  Olá, {displayName} — Minha conta
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="rounded-sm px-3 py-2.5 text-left text-terracotta-600 hover:bg-terracotta-50"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/entrar"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-sm px-3 py-2.5 font-semibold text-wood-700 hover:bg-wood-100"
              >
                Entrar / Cadastrar
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
