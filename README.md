# Estande Livre

Locadora de livros ponta a ponta: portal do leitor, contratos digitais, motor de multas em tempo real e backoffice administrativo. Uma biblioteca clássica, agora em código.

---

## O que este projeto é

Uma plataforma **completa** para locação de livros, dividida em três eixos:

1. **Portal do Leitor** — vitrine com destaques, catálogo com filtros, página de detalhes rica, sacola de leitura lateral com previsão de devolução, checkout com termo de locação estilizado como documento antigo.
2. **Motor de Negócios** — aceite digital com timestamp, cálculo dinâmico de multas por atraso, taxas de dano/extravio, painel do leitor com KPIs em tempo real.
3. **Backoffice Admin** — dashboard com atrasos em destaque, CRUD completo de acervo (com upload de capas para Supabase Storage), listagem de todos os empréstimos, fluxo de auditoria de devoluções com modal avaliativo de condição.

### Recursos avançados (v2)

- **Notificações automáticas** — Edge Function que roda diariamente e avisa por e-mail leitores com empréstimo vencendo em 2 dias, atrasado, ou com reserva disponível.
- **Reserva / fila de espera** — quando um título está esgotado, o leitor entra na fila pelo botão "Avisar quando disponível". Ao devolver, o próximo da fila é notificado automaticamente e tem 48h para retirar.
- **Renovação de empréstimo** — o leitor renova 1 vez pelo próprio painel, direto pela "Minha estante", desde que não esteja atrasado nem haja fila pelo livro.
- **Registro de pagamento de multa** — admin dá baixa em multas de atraso e taxas de dano/extravio, com forma de pagamento e observações, tudo auditável.
- **Perfil completo do leitor** — página `/admin/leitores/:id` com taxa de atraso, histórico de danos/extravios e todo o histórico de empréstimos daquele leitor.

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

Abra o **SQL Editor** do seu projeto Supabase e execute, **nesta ordem exata**
(a ordem importa: cada arquivo depende de funções criadas no anterior):

1. `supabase/schema.sql` — cria tabelas, índices, triggers e funções
2. `supabase/rls-policies.sql` — configura Row Level Security (cria `is_admin()`, usada depois)
3. `supabase/migration_v2.sql` — reservas, renovação, pagamento de multa, notificações, stats de leitor
4. `supabase/rls-v2.sql` — RLS das tabelas novas (`reservations`, `notification_log`)
5. `supabase/migration_v3.sql` — congela valores do contrato por locação + consentimento LGPD
6. `supabase/migration_v4.sql` — tabela de configurações do sistema (editável pelo admin, sem redeploy)
7. `supabase/migration_v5.sql` — checkout atômico (corrige corrida de disponibilidade) + locação no balcão
8. `supabase/seed.sql` — categorias e livros de exemplo (opcional)

### 3.1 Deploy da Edge Function de notificações (opcional, mas recomendado)

O arquivo `supabase/functions/notify-rentals/index.ts` roda diariamente e envia
e-mails de: vencimento em 2 dias, atraso, e reserva disponível. Sem
`RESEND_API_KEY` configurada, ela só loga no console — dá pra testar sem custo.

Instruções completas de deploy e agendamento (cron) estão em
`supabase/functions/notify-rentals/README.md`. Resumo:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set EMAIL_FROM="Estande Livre <contato@seu-dominio.com>"
supabase secrets set SITE_URL="https://estandelivre.com.br"
supabase functions deploy notify-rentals
```

### 3.2 Deploy da Edge Function de locação no balcão (necessária para /admin/nova-locacao)

`supabase/functions/admin-create-reader/index.ts` cria conta de leitor por
pedido do admin, sem precisar de secrets novos (reaproveita
`SUPABASE_SERVICE_ROLE_KEY`, já disponível por padrão). Deploy:

```bash
supabase functions deploy admin-create-reader
```

Detalhes em `supabase/functions/admin-create-reader/README.md`.

Depois, agende via **Database → Cron Jobs** no painel do Supabase (SQL de exemplo no README da function).

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
- `rentals` — transacional: `user_id`, `book_id`, `rented_at`, `due_date`, `returned_at`, `status`,
  `daily_fine_rate`, `late_fee`, `damage_fee`, `terms_accepted_at`, `renewals_count`, `max_renewals`,
  `late_fee_paid`, `damage_fee_paid`, `paid_at`, `payment_method`, `payment_notes`
- `reservations` — fila de espera: `user_id`, `book_id`, `status` (`waiting`/`notified`/`fulfilled`/`cancelled`/`expired`), `expires_at`
- `notification_log` — auditoria de e-mails enviados/pendentes, evita duplicidade no mesmo dia

Funções RPC:
- `decrement_available_copies(book_id)` — no checkout
- `increment_available_copies(book_id)` — na devolução (exceto extravio); dispara notificação da fila
- `is_admin()` — usada pelas policies RLS
- `renew_rental(rental_id, extension_days)` — renovação com todas as regras de negócio validadas no banco
- `create_reservation(book_id)` / `cancel_reservation(reservation_id)` — fila de espera
- `reservation_position(reservation_id)` — posição do leitor na fila
- `register_payment(rental_id, pay_late, pay_damage, method, notes)` — baixa de multa (admin)
- `reader_stats(reader_id)` — agregados de um leitor: total, atrasos, taxa de atraso, pendências
- View `late_rentals_view` — aluguéis atrasados com dias e multa acumulada
- View `financial_pending_view` — todas as pendências financeiras em aberto

---

## Rotas

| Rota | Descrição | Auth |
|------|-----------|------|
| `/` | Home com hero, destaques, categorias | público |
| `/acervo` | Catálogo com filtros e busca | público |
| `/livro/:slug` | Detalhe do livro + botão sacola | público |
| `/checkout` | Termo de locação + confirmação | usuário |
| `/minha-estante` | Painel do leitor + multas em tempo real | usuário |
| `/minha-conta` | Editar nome e telefone | usuário |
| `/entrar` `/cadastrar` | Autenticação | público |
| `/esqueci-senha` | Solicitar link de redefinição | público |
| `/redefinir-senha` | Definir nova senha | via link de e-mail |
| `/privacidade` | Política de Privacidade (LGPD) | público |
| `/admin` | Dashboard admin | admin |
| `/admin/nova-locacao` | Registrar locação no balcão (leitor sem site) | admin |
| `/admin/livros` | CRUD acervo | admin |
| `/admin/emprestimos` | Todos os aluguéis + registro de pagamento | admin |
| `/admin/devolucoes` | Fluxo de auditoria | admin |
| `/admin/leitores` | Lista de leitores | admin |
| `/admin/leitores/:id` | Perfil completo + histórico + stats | admin |
| `/admin/categorias` | CRUD de categorias | admin |
| `/admin/configuracoes` | Regras de locação + dados da loja | admin |

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

## Checklist antes de ir ao ar

Passos que não têm arquivo — são configuração direta no painel do Supabase.
Faça **nesta ordem**, antes de divulgar o site pro público:

### 1. Site URL e Redirect URLs (obrigatório)

Sem isso, o link de "esqueci minha senha" e a confirmação de cadastro por
e-mail vão redirecionar para `localhost` mesmo em produção.

No painel do Supabase → **Authentication → URL Configuration**:

- **Site URL**: coloque o domínio final, ex. `https://estandelivre.com.br`
- **Redirect URLs**: adicione (uma por linha):
  ```
  https://estandelivre.com.br/redefinir-senha
  https://estandelivre.com.br/**
  ```
  O `/**` no final cobre qualquer rota do site como destino de redirecionamento pós-login.

Se você ainda está testando antes do domínio final, pode adicionar também
`http://localhost:5173/**` na mesma lista — as duas convivem.

### 2. Agendar as notificações diárias

Depois de fazer o deploy da Edge Function (`supabase functions deploy notify-rentals`),
rode `supabase/cron_setup.sql` no SQL Editor — substituindo `SEU_PROJECT_REF` e
`SEU_SERVICE_ROLE_KEY` pelos valores do seu projeto (Project Settings → API).
Isso agenda o envio automático de e-mails de vencimento/atraso/reserva todo dia.

### 3. SMTP próprio (recomendado antes de abrir pro público)

Por padrão, e-mails de confirmação de cadastro e redefinição de senha saem
por um serviço compartilhado do Supabase, com limite baixo de envios por hora.
Configure um provedor próprio (pode ser o mesmo Resend usado na Edge Function)
em **Authentication → Emails → SMTP Settings**.

### 4. Considerar o plano do Supabase

O projeto gratuito **pausa automaticamente após 7 dias sem uso**. Para uma
locadora em produção real, o ideal é migrar para o plano Pro — mas se por
enquanto você vai seguir no free, pelo menos configure um "ping" periódico
(o próprio cron da notificação diária, do passo 2, já resolve isso, porque
ele bate na API todo dia).

### 5. Backup do banco (importante — plano free não tem backup automático)

Diferente do plano Pro, o **free não inclui backup automático diário**.
Isso é responsabilidade sua enquanto estiver nesse plano. Duas opções, já
prontas no projeto:

**Opção A — Automático, de graça (recomendado):** `.github/workflows/backup.yml`
já configurado. Basta:
1. Subir este projeto para um repositório no GitHub
2. Em Settings → Secrets and variables → Actions, criar o secret
   `SUPABASE_DB_URL` com a connection string do seu banco (Project Settings
   → Database → Connection string → URI)
3. Pronto — todo segunda-feira roda sozinho, backup fica disponível por
   90 dias na aba Actions → Artifacts do repositório

**Opção B — Manual, quando você lembrar:** `scripts/backup.sh` — rode
localmente com `DATABASE_URL` configurada (instruções dentro do próprio
arquivo). Bom pra tirar um backup extra antes de uma mudança arriscada.

Nenhuma das duas fica gravada no seu computador sozinho — programe um
lembrete pra baixar os arquivos de tempos em tempos e guardar em outro
lugar (Google Drive, etc.), já que os artefatos do GitHub expiram em 90 dias.

---

## Recuperação de senha

Fluxo completo já implementado:

1. Leitor esquece a senha → clica em "Esqueceu sua senha?" na tela de login (`/esqueci-senha`)
2. Informa o e-mail → Supabase envia um link de redefinição
3. Leitor clica no link → cai em `/redefinir-senha`, já autenticado temporariamente
4. Define a senha nova → é redirecionado para `/minha-estante`

Depende do passo **1 do checklist acima** (Redirect URLs) para funcionar em produção.

---

### 6. Captcha no cadastro (recomendado)

Sem captcha, `/cadastrar` fica exposto a bots assim que o site ganhar
tráfego. Já está integrado (Cloudflare Turnstile — gratuito, sem SDK pesado):

1. Crie um site em [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Coloque a **Site Key** em `VITE_TURNSTILE_SITE_KEY` no seu `.env`
3. No painel do Supabase → **Authentication → Attack Protection**, ative
   "Enable CAPTCHA protection", escolha Turnstile e cole a **Secret Key**
   (essa fica só no Supabase, nunca no `.env` do front-end)

Sem essa variável configurada, o formulário de cadastro funciona
normalmente, só sem a proteção — útil em desenvolvimento local.

### 7. Monitoramento de erros (opcional, recomendado)

Crie um projeto gratuito em [sentry.io](https://sentry.io), copie o DSN
para `VITE_SENTRY_DSN` no `.env`. Sem essa variável, o app roda igual, só
sem telemetria de erros em produção.

---

## Privacidade e LGPD

- Página `/privacidade` com a política completa (texto genérico incluído —
  **revise com um advogado antes de publicar**, o texto aqui é um ponto de
  partida, não aconselhamento jurídico)
- Checkbox obrigatório no cadastro, com timestamp gravado em
  `profiles.privacy_accepted_at`
- Leitor pode editar os próprios dados em `/minha-conta`, sem precisar
  pedir pra você mexer direto no banco

## Configurações do sistema (sem precisar de redeploy)

A partir da `migration_v4.sql`, prazo de locação, multa diária, taxas de
dano/extravio, limite de livros por locação e os dados de contato da loja
(endereço, telefone, horário — exibidos no rodapé) ficam numa tabela
`settings` no banco, editável em **`/admin/configuracoes`**.

- Mudanças ali valem só para **locações novas** a partir daquele momento
- As variáveis `VITE_MAX_BOOKS_PER_RENTAL`, `VITE_RENTAL_DAYS` e
  `VITE_DAILY_FINE` no `.env` continuam existindo como **fallback de
  segurança** — se a tabela `settings` não existir ainda (antes de rodar
  a `migration_v4.sql`) ou a leitura falhar, o site usa esses valores em
  vez de quebrar

### Contrato de locação — valores congelados

Empréstimos já em curso **não são afetados** por mudanças em
`/admin/configuracoes`. Os valores do termo (prazo, multa diária, taxa de
dano, taxa de extravio) são gravados na própria linha de `rentals` no
momento do aceite (`rental_days`, `daily_fine_rate`, `damage_fee_rate`,
`loss_fee_rate`). Só locações novas usam os valores atualizados — contratos
já assinados continuam valendo pelas regras que a pessoa realmente aceitou.

## Categorias

Gestão completa em **`/admin/categorias`** — criar, editar, remover. Antes,
só era possível criar categoria via SQL direto no banco.

## Correção: multa de atraso não estava totalmente congelada

Ao implementar o congelamento do contrato (v3), a taxa de dano e extravio
ficaram corretamente presas ao valor aceito na locação — mas a **multa
diária de atraso**, calculada em tempo real no painel do leitor e do admin,
ainda lia a configuração "ao vivo" em vez do `daily_fine_rate` já gravado
por locação. Corrigido: `calculateFine()` agora recebe a taxa congelada da
própria locação como parâmetro em todos os lugares que a usam.

## Correção: corrida no checkout

Antes, o checkout inseria a locação e só depois decrementava as cópias
disponíveis — em dois passos separados. Se duas pessoas confirmassem a
locação do mesmo livro (com 1 cópia só) quase ao mesmo tempo, as duas
podiam conseguir. Agora todo o checkout roda dentro de uma única transação
no banco (`create_checkout` / `admin_checkout`), com trava de linha no
livro: a segunda tentativa concorrente espera a primeira terminar e só
então vê corretamente que não há mais cópias.

## Locação no balcão

`/admin/nova-locacao` — para quando alguém entra na loja e vai levar um
livro sem ter usado o site. Busca leitor já cadastrado ou cria um novo na
hora (a criação de conta usa a Edge Function `admin-create-reader`, que
roda no servidor porque só a `service_role key` pode criar contas de
autenticação). Mesma trava de disponibilidade do checkout normal.

## Promover administrador

Em `/admin/leitores/:id`, botão "Tornar administrador" — a regra de RLS já
permitia essa ação, só faltava o botão na interface. Pede confirmação
explícita, já que dá acesso completo ao backoffice.

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
