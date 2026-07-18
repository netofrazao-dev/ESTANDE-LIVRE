import { NavLink } from 'react-router-dom';

const linkBase =
  'rounded-full px-4 py-1.5 font-sans text-sm font-semibold transition-colors duration-300';

export default function AdminNav() {
  return (
    <nav className="mb-8 flex gap-2">
      <NavLink
        to="/admin"
        end
        className={({ isActive }) =>
          `${linkBase} ${isActive ? 'bg-moss-600 text-parchment' : 'text-wood-600 hover:bg-wood-100'}`
        }
      >
        Empréstimos
      </NavLink>
      <NavLink
        to="/admin/livros"
        className={({ isActive }) =>
          `${linkBase} ${isActive ? 'bg-moss-600 text-parchment' : 'text-wood-600 hover:bg-wood-100'}`
        }
      >
        Livros
      </NavLink>
    </nav>
  );
}
