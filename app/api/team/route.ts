import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUserSchema, validationError } from '@/lib/validations'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser || dbUser.role !== 'admin') {
    return { error: 'Acceso denegado', status: 403 as const }
  }

  return { error: null, status: null }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('id, auth_user_id, email, display_name, role, phone, is_active, color, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 })
  }

  const { name, email, password, role, color } = parsed.data
  const admin = createAdminClient()

  // 1. Create the auth user (email confirmed so they can log in immediately)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    const msg = authError?.message ?? 'No se pudo crear el usuario'
    const status = /already been registered|already exists/i.test(msg) ? 409 : 500
    return NextResponse.json(
      { error: status === 409 ? 'Ya existe un usuario con ese email' : msg },
      { status },
    )
  }

  // 2. Insert the app-level users record linked to the auth user
  const { data: dbUser, error: dbError } = await admin
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      email: email.trim(),
      display_name: name,
      role: role ?? 'vendedor',
      color: color ?? null,
      is_active: true,
    })
    .select('id, auth_user_id, email, display_name, role, phone, is_active, color, created_at')
    .single()

  if (dbError || !dbUser) {
    // Roll back the auth user so we don't leave an orphan
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError?.message ?? 'Error al crear el usuario' }, { status: 500 })
  }

  return NextResponse.json(dbUser, { status: 201 })
}
