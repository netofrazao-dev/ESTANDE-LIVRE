# 📚 Estante Livre

Plataforma de aluguel de livros — React (Vite) + Tailwind CSS + Zustand + Supabase.

## Status: Storage + Página de Detalhes ✅

- [x] Schema SQL (Supabase) com RLS
- [x] Tema visual rústico (Tailwind config)
- [x] Estrutura de pastas do frontend
- [x] Componentes base (Button, Badge, BookCard)
- [x] Navbar, Home, Sacola de leitura (Zustand)
- [x] Autenticação (Supabase Auth: login/cadastro/logout)
- [x] Checkout → grava aluguéis no Supabase (14 dias de prazo)
- [x] Painel do leitor (Minha Conta)
- [x] Admin Dashboard (rota protegida, confirmar devolução)
- [x] Termos de Locação obrigatórios no checkout
- [x] Alerta de vencimento próximo + multa estimada por atraso
- [x] Checklist de devolução no Admin (danos + confirmação de multa)
- [x] P0 — Correção de falha de RLS (auto-promoção a admin)
- [x] P0 — Regras de negócio (limite de 3 aluguéis, due_date/total_price) movidas para o banco
- [x] P0 — Catálogo conectado ao Supabase (sem dados mockados)
- [x] P0 — CRUD de livros no admin (`/admin/livros`)
- [x] **Upload de capas via Supabase Storage (bucket `book-covers`)**
- [x] **Página de detalhes do livro (`/livro/:id`)**
- [ ] Pagamento, e-mails automáticos, status "atrasado" automatizado
- [ ] Ver lista de prioridades P2/P3 discutida com o time

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha com suas credenciais do Supabase
npm run dev
```

**Scripts SQL — rode nesta ordem no SQL Editor do Supabase:**
1. `supabase/schema.sql` (Fase 1) — tabelas, triggers de estoque, RLS.
2. `supabase/phase4_auth_sync.sql` (Fase 4) — sincroniza `auth.users` com `public.users` automaticamente ao cadastrar.
3. `supabase/phase5_contracts_fees.sql` (Fase 5) — aceite de contrato, multa acumulada e condição de devolução.
4. `supabase/p0_security_and_rules.sql` (P0) — corrige a falha de RLS e move regras de negócio para o banco.
5. `supabase/storage_book_covers.sql` — cria o bucket `book-covers` e as políticas de acesso.

Para testar o Admin Dashboard, promova seu usuário de teste rodando:
```sql
update public.users set role = 'admin' where email = 'seu-email@exemplo.com';
```

## O que mudou nesta rodada

**Storage (`storage_book_covers.sql`, `storage.service.js`, `BookFormModal.jsx`):**
- Bucket público `book-covers` no Supabase Storage: qualquer visitante pode *ver* as capas (necessário pro catálogo funcionar sem login), mas só admin pode enviar/substituir/remover arquivos.
- O formulário de livro no admin trocou o campo "URL da capa" por um upload de arquivo de verdade (JPG/PNG/WEBP, até 5MB), com preview antes de salvar.

**Página de detalhes (`BookDetail.jsx`, rota `/livro/:id`):**
- Substitui o modal simplificado que existia antes.
- Mostra capa grande, categoria, sinopse completa, editora/ano/ISBN/idioma, e o mesmo botão de adicionar/remover da sacola usado no catálogo.
- Clicar em qualquer `BookCard` (catálogo ou busca) agora navega para essa página em vez de abrir um modal.

## Árvore de diretórios

```
estante-livre/
├── index.html
├── tailwind.config.js       # paleta rústica + tipografia (Playfair Display / Inter)
├── postcss.config.js
├── vite.config.js
├── package.json
├── .env.example
├── supabase/
│   └── schema.sql           # tabelas, triggers e políticas RLS
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css             # diretivas Tailwind + classes utilitárias (.btn-primary, .card-shelf...)
    ├── lib/
    │   └── supabaseClient.js # instância única do client Supabase
    ├── services/             # camada de acesso a dados (1 arquivo por entidade)
    │   └── books.service.js  # ex: listBooks(), createRental(), etc.
    ├── store/                # estado global (Zustand)
    │   └── useAuthStore.js   # ex: useCartStore, useRentalStore...
    ├── components/
    │   ├── ui/                # botões, inputs, modais — componentes "burros" reutilizáveis
    │   ├── layout/             # Header, Footer, Sidebar, Shell da aplicação
    │   ├── books/              # BookCard, BookGrid, BookDetails...
    │   ├── rentals/            # RentalCard, RentalHistory, ReturnButton...
    │   └── auth/               # LoginForm, RegisterForm, ProtectedRoute...
    ├── pages/                 # uma página por rota (Home, Catalog, BookDetail, MyRentals, Admin...)
    ├── hooks/                 # hooks customizados (useDebounce, useBooks...)
    ├── utils/                 # formatadores, helpers de data/preço
    └── assets/                # imagens, texturas, ícones estáticos
```

### Convenções

- **Services** nunca são chamados diretamente de dentro de um componente complexo sem passar por
  um hook ou store — eles ficam isolados para facilitar testes e trocas futuras.
- **Stores Zustand** guardam apenas estado *global* (sessão do usuário, carrinho de aluguel). Estado local de UI fica em `useState` dentro do próprio componente.
- **Paleta de cores** (ver `tailwind.config.js`): `parchment` (fundo), `wood` (textos/madeira), `moss` (ação primária), `terracotta` (destaque/alerta).
