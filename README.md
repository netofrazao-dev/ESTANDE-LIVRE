# 📚 Estante Livre

Plataforma de aluguel de livros — React (Vite) + Tailwind CSS + Zustand + Supabase.

## Status: Pagamento na retirada + Automação (status atrasado + e-mails) ✅

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
- [x] Upload de capas via Supabase Storage (bucket `book-covers`)
- [x] Página de detalhes do livro (`/livro/:id`)
- [x] **Status "atrasado" automático (pg_cron, diário)**
- [x] **E-mail de confirmação de aluguel (Database Webhook → Edge Function)**
- [x] **E-mail de lembrete (2 dias antes) e aviso de atraso (pg_cron + Edge Function)**
- [x] **Modelo de pagamento definido e implementado: reserva 100% online, pagamento na retirada (balcão)**
- [ ] UX/robustez: sacola persistente, menu mobile completo, paginação

## Como rodar (frontend)

```bash
npm install
cp .env.example .env.local   # preencha com suas credenciais do Supabase
npm run dev
```

**Scripts SQL — rode nesta ordem no SQL Editor do Supabase:**
1. `supabase/schema.sql`
2. `supabase/phase4_auth_sync.sql`
3. `supabase/phase5_contracts_fees.sql`
4. `supabase/p0_security_and_rules.sql`
5. `supabase/storage_book_covers.sql`
6. `supabase/payment_pickup_model.sql` — adiciona `payment_status`/`payment_confirmed_at` (pagamento na retirada)
7. `supabase/automation_overdue_status.sql` — status "atrasado" automático (autocontido, não precisa de nada externo)
8. `supabase/automation_email_cron.sql` — agenda o e-mail diário de lembretes (**rode só depois** de fazer o deploy das Edge Functions, passo abaixo)

Para testar o Admin Dashboard, promova seu usuário de teste:
```sql
update public.users set role = 'admin' where email = 'seu-email@exemplo.com';
```

## Como ativar os e-mails (Edge Functions)

Os e-mails usam [Resend](https://resend.com) (tem plano gratuito, e funciona sem verificar domínio próprio se você mandar só para o e-mail da sua conta Resend — pra produção de verdade, verifique um domínio lá).

```bash
# 1. Login e link do projeto (uma vez só)
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF

# 2. Configurar os secrets usados pelas funções
npx supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="Estante Livre <onboarding@resend.dev>"

# 3. Deploy das duas funções
npx supabase functions deploy send-rental-confirmation
npx supabase functions deploy send-due-reminders --no-verify-jwt
```

Depois do deploy:
- **E-mail de confirmação de aluguel**: configure em *Painel do Supabase → Database → Webhooks → Create a new hook* (tabela `rentals`, evento `INSERT`, tipo "Supabase Edge Functions", função `send-rental-confirmation`). O painel cuida da autenticação sozinho.
- **E-mail de lembrete diário**: rode `automation_email_cron.sql`, substituindo `COLE_SUA_SERVICE_ROLE_KEY_AQUI` (Project Settings → API → service_role) e `<PROJECT_REF>` pelos dados do seu projeto. A chave fica guardada no **Vault** do Supabase, nunca em texto puro.

> Não tenho como testar o envio de verdade a partir daqui, já que isso depende de credenciais reais do seu projeto Supabase e da sua conta Resend — o código está pronto e documentado, mas o primeiro teste de ponta a ponta precisa ser feito com suas chaves.

## O que mudou nesta rodada

**Pagamento na retirada (`payment_pickup_model.sql`):**
- Modelo de negócio definido com você: reserva 100% online, pagamento presencial no balcão.
- Novas colunas em `rentals`: `payment_status` (`pending`/`paid`) e `payment_confirmed_at`.
- Admin Dashboard ganhou uma coluna "Pagamento" e o botão **"Confirmar retirada"**, separado do "Confirmar devolução" — refletindo que são dois momentos distintos (retirada+pagamento vs. devolução).
- Painel do Leitor mostra "Pague na retirada: R$ X,XX" ou "Pagamento recebido ✓" em cada aluguel.
- Termos de Locação e a sacola agora deixam esse fluxo explícito antes do checkout.

**Automação (`automation_overdue_status.sql`, `automation_email_cron.sql`, `supabase/functions/`):**
- Um job `pg_cron` roda todo dia de madrugada e marca como `overdue` qualquer aluguel vencido — deixa de depender só do cálculo no front-end.
- E-mail de **confirmação de reserva** (já mencionando o pagamento na retirada) disparado automaticamente por um Database Webhook assim que o checkout grava a linha em `rentals`.
- E-mail de **lembrete 2 dias antes** do vencimento e de **aviso de atraso**, enviados por um cron diário (`send-due-reminders`).
- Segredos (API key da Resend, service role key) ficam em Supabase Secrets/Vault — nunca em texto puro no código ou no SQL.

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
