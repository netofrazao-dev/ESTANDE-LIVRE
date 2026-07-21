// ═══════════════════════════════════════════════════════════════════
// admin-create-reader — Edge Function
// Cria um leitor (usuário de autenticação + profile) sob demanda do
// admin, para registrar locação no balcão sem a pessoa passar pelo
// cadastro sozinha. Só a service_role key pode criar usuários de auth,
// por isso isso precisa rodar no servidor, não no client.
//
// Segurança: verifica que quem está chamando é um admin autenticado
// ANTES de criar qualquer coisa. O token do admin vem no header
// Authorization, o front-end já manda isso (ver useCreateReaderByAdmin).
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

// Cliente com privilégio total — só usado depois de confirmar que quem
// pediu é admin.
const adminClient = createClient(supabaseUrl, serviceRoleKey)

function randomTempPassword() {
  // Senha temporária aleatória — o leitor nunca precisa saber dela, porque
  // vai entrar depois pelo fluxo de "esqueci minha senha" se quiser acesso
  // próprio à conta. Enquanto isso, o admin consegue operar por ele.
  return crypto.randomUUID() + crypto.randomUUID()
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Verifica quem está chamando (precisa ser admin) ──
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente com a chave anon + o token do usuário, só pra descobrir quem é
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await callerClient.auth.getUser(token)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar leitores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Valida payload ──
    const { full_name, email, phone } = await req.json()
    if (!full_name || !email) {
      return new Response(JSON.stringify({ error: 'Nome e e-mail são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Cria o usuário (o trigger handle_new_user cria o profile) ──
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: randomTempPassword(),
      email_confirm: true, // criado pelo admin, não precisa confirmar e-mail
      user_metadata: { full_name, phone: phone || null },
    })

    if (createErr) {
      const msg = createErr.message?.includes('already been registered')
        ? 'Já existe um leitor cadastrado com esse e-mail.'
        : createErr.message
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ id: created.user.id, email: created.user.email, full_name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Erro inesperado' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
