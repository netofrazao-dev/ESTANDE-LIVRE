# Edge Function: admin-create-reader

Cria um leitor (conta de autenticação + profile) por pedido de um admin —
usada na tela `/admin/nova-locacao` para registrar locação de alguém que
entrou na loja sem ter feito cadastro pelo site.

## Por que precisa de Edge Function

Criar um usuário de autenticação exige a `service_role key`, que nunca pode
ficar exposta no front-end (ela ignora todas as regras de RLS). Por isso
essa etapa roda no servidor, verificando primeiro que quem está pedindo é
mesmo um admin autenticado.

## Deploy

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy admin-create-reader
```

Não precisa configurar nenhum secret novo — `SUPABASE_URL`,
`SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem
automaticamente em todo projeto Supabase (os mesmos usados pela função
`notify-rentals`).

## Teste manual

```bash
curl -X POST https://SEU_PROJECT_REF.supabase.co/functions/v1/admin-create-reader \
  -H "Authorization: Bearer TOKEN_DE_UM_ADMIN_LOGADO" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Maria Teste","email":"maria.teste@example.com","phone":"91999999999"}'
```

Retorna `{ id, email, full_name }` em caso de sucesso, ou `{ error }` com
status 401/403/400 conforme o problema (não autenticado, não é admin, ou
e-mail já cadastrado).
