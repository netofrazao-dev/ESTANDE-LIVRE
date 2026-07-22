-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v7
-- WhatsApp e Instagram da loja
-- ═══════════════════════════════════════════════════════════════════

alter table public.settings
  add column if not exists whatsapp_number text,
  add column if not exists instagram_url text;

comment on column public.settings.whatsapp_number is
  'Número de WhatsApp da loja, com DDI e DDD, só dígitos ou com formatação
   — a formatação é limpa automaticamente no front-end ao montar o link
   de contato (wa.me).';
comment on column public.settings.instagram_url is
  'Link completo do perfil do Instagram da loja.';

-- Preenche a linha já existente com os valores atuais — "alter ... add
-- column ... default" só vale pra linhas novas, não afeta a linha
-- singleton (id=1) que você já tem.
update public.settings
set
  whatsapp_number = coalesce(nullif(whatsapp_number, ''), '+55 91 9153-4970'),
  instagram_url = coalesce(nullif(instagram_url, ''), 'https://www.instagram.com/estantelivre.locadora/')
where id = 1;
