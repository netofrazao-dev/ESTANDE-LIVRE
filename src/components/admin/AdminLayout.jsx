import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  BookMarked,
  Library,
  PackageCheck,
  ArrowLeft,
  Shield,
  Users,
  Tag,
  Settings,
  PlusCircle,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const items = [
  { to: '/admin', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/admin/nova-locacao', label: 'Nova locação', icon: PlusCircle },
  { to: '/admin/livros', label: 'Acervo', icon: BookMarked },
  { to: '/admin/categorias', label: 'Categorias', icon: Tag },
  { to: '/admin/planos-de-preco', label: 'Planos de preço', icon: DollarSign },
  { to: '/admin/emprestimos', label: 'Empréstimos', icon: Library },
  { to: '/admin/devolucoes', label: 'Devoluções', icon: PackageCheck },
  { to: '/admin/leitores', label: 'Leitores', icon: Users },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

export default function AdminLayout() {
  const profile = useAuthStore((s) => s.profile)

  return (
    <div className="min-h-screen flex bg-pergaminho">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-cafe text-pergaminho flex flex-col">
        <Link to="/" className="p-6 border-b border-pergaminho/10 hover:bg-cafe-light transition-colors">
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 opacity-60" />
            <span className="text-xs opacity-60">Voltar à locadora</span>
          </div>
          <div className="font-display text-xl mt-2">Backoffice</div>
        </Link>

        <nav className="flex-1 p-3 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-musgo/20 text-pergaminho border-l-2 border-musgo pl-[10px]'
                    : 'text-pergaminho/70 hover:text-pergaminho hover:bg-pergaminho/5',
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-pergaminho/10 text-xs">
          <div className="flex items-center gap-2 text-pergaminho/70 mb-1">
            <Shield className="w-3 h-3" />
            Administrador
          </div>
          <div className="font-medium">{profile?.full_name}</div>
          <div className="text-pergaminho/50 text-[10px] mt-1">{profile?.email}</div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-screen overflow-x-hidden">
        <div className="p-8 md:p-12 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
