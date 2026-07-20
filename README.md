# Estande Livre

Locadora de livros ponta a ponta: portal do leitor, contratos digitais, motor de multas em tempo real e backoffice administrativo. Uma biblioteca clássica, agora em código.

---

## O que este projeto é

Uma plataforma **completa** para locação de livros, dividida em três eixos:

1. **Portal do Leitor** — vitrine com destaques, catálogo com filtros, página de detalhes rica, sacola de leitura lateral com previsão de devolução, checkout com termo de locação estilizado como documento antigo.
2. **Motor de Negócios** — aceite digital com timestamp, cálculo dinâmico de multas por atraso, taxas de dano/extravio, painel do leitor com KPIs em tempo real.
3. **Backoffice Admin** — dashboard com atrasos em destaque, CRUD completo de acervo (com upload de capas para Supabase Storage), listagem de todos os empréstimos, fluxo de auditoria de devoluções com modal avaliativo de condição.

---

## Stack

- **Front:** React 18 + Vite 5
- **Estilo:** Tailwind CSS 3 com design system customizado (tokens, tipografia, animações)
- **Estado:** Zustand para sacola + auth · React Query para cache de servidor
- **Animações:** Framer Motion
- **Backend:** Supabase (Postgres + Auth + Storage + RLS)
- **Roteamento:** React Router 6
- **Ícones:** Lucide
- **Datas:** date-fns com locale pt-BR

---

## Design System

Fugindo do visual "plástico" da web moderna, tudo é pensado como uma **biblioteca clássica**:

- **Paleta**: pergaminho `#F9F6F0` (fundo), café `#3E2723` (texto), verde musgo `#5A6E4A` (CTA), terracota `#B85C3E` (atrasos/alertas), sépia `#8B6F47` (linhas/detalhes)
- **Tipografia**: Playfair Display (títulos), Inter (corpo), JetBrains Mono (números/datas em estilo datador de biblioteca)
- **Signature**: cards de livro como fichas catalográficas — número de tombo, categoria em small caps, elevação suave no hover simulando o gesto de retirar da estante
- **Detalhes**: divisores em linha dupla estilo página de livro antiga, datas no formato `12 · MAI · 2026`, "carimbos" ligeiramente inclinados para status

---

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

Crie um projeto no [Supabase](https://supabase.com/) e copie o `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha com:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 3. Rodar as migrations no Supabase

Abra o **SQL Editor** do seu projeto Supabase e execute, **nesta ordem**:

1. `supabase/schema.sql` — cria tabelas, índices, triggers e funções
2. `supabase/rls-policies.sql` — configura Row Level Security
3. `supabase/seed.sql` — categorias e livros de exemplo (opcional)

### 4. Criar o bucket de capas

O script `schema.sql` já cria o bucket `book-covers` público. Se precisar recriar manualmente:

- Storage → Create new bucket → nome: `book-covers` → **Public bucket** marcado.

### 5. Promover um usuário a admin

Depois de fazer signup pela interface, rode no SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'seu-email@exemplo.com';
```

### 6. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173).

---

## Estrutura de pastas

```
src/
├── components/
│   ├── admin/            # Layout do backoffice
│   ├── books/            # BookCard, BookGrid, BookFilters
│   ├── cart/             # Sacola de leitura (slide-over)
│   ├── layout/           # Header, Footer, Layout, ProtectedRoute
│   └── ui/               # Button, Input, Modal, Badge, EmptyState
├── hooks/
│   ├── useBooks.js       # React Query — livros
│   └── useRentals.js     # React Query — aluguéis, checkout, devoluções
├── lib/
│   ├── supabase.js       # Cliente Supabase
│   └── utils.js          # cn(), formatMoney, calculateFine, formatDatador...
├── pages/
│   ├── admin/            # Dashboard, Books, Rentals, Returns
│   ├── Home.jsx
│   ├── Catalog.jsx
│   ├── BookDetail.jsx
│   ├── Checkout.jsx
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── MyRentals.jsx
│   └── NotFound.jsx
├── stores/
│   ├── authStore.js      # Zustand — auth
│   └── cartStore.js      # Zustand — sacola persistente
├── App.jsx
├── main.jsx
└── index.css             # Design system: variáveis, componentes, utilitários

supabase/
├── schema.sql            # DDL completo
├── rls-policies.sql      # Row Level Security
└── seed.sql              # Categorias + livros de exemplo
```

---

## Modelo de dados

- `profiles` — estende `auth.users` com `full_name`, `phone`, `role` (`user` ou `admin`)
- `categories` — taxonomia do acervo
- `books` — catálogo com `total_copies`, `available_copies`, `featured`, `catalog_number` (nº de tombo)
- `rentals` — transacional: `user_id`, `book_id`, `rented_at`, `due_date`, `returned_at`, `status`, `daily_fine_rate`, `late_fee`, `damage_fee`, `terms_accepted_at`

Funções RPC:
- `decrement_available_copies(book_id)` — no checkout
- `increment_available_copies(book_id)` — na devolução (exceto extravio)
- `is_admin()` — usada pelas policies RLS
- View `late_rentals_view` — aluguéis atrasados com dias e multa acumulada

---

## Rotas

| Rota | Descrição | Auth |
|------|-----------|------|
| `/` | Home com hero, destaques, categorias | público |
| `/acervo` | Catálogo com filtros e busca | público |
| `/livro/:slug` | Detalhe do livro + botão sacola | público |
| `/checkout` | Termo de locação + confirmação | usuário |
| `/minha-estante` | Painel do leitor + multas em tempo real | usuário |
| `/entrar` `/cadastrar` | Autenticação | público |
| `/admin` | Dashboard admin | admin |
| `/admin/livros` | CRUD acervo | admin |
| `/admin/emprestimos` | Todos os aluguéis | admin |
| `/admin/devolucoes` | Fluxo de auditoria | admin |

---

## Configurações (via .env)

```
VITE_MAX_BOOKS_PER_RENTAL=3   # Livros por locação
VITE_RENTAL_DAYS=14           # Prazo padrão em dias
VITE_DAILY_FINE=2.00          # R$ por dia de atraso
```

Taxas fixas em `src/lib/utils.js`:
- `damageFee`: R$ 50,00 (dano)
- `lossFee`: R$ 150,00 (extravio)

---

## Deploy

### Vercel

1. Conecte o repo à Vercel
2. Framework preset: **Vite**
3. Adicione as variáveis de ambiente (as `VITE_*`)
4. Deploy

### Netlify

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Adicione um `_redirects` em `public/`:
   ```
   /*  /index.html  200
   ```

---

## Feito à mão, com café, por leitores.
