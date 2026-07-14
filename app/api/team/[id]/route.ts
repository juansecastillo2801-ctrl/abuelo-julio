import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateUserSchema, validationError } from '@/lib/validations'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const, userId: null }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser || dbUser.role !== 'admin') {
    return { error: 'Acceso denegado', status: 403 as const, userId: null }
  }

  return { error: null, status: null, userId: dbUser.id as string }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 })
  }

  // An admin cannot remove their own admin role
  if (id === auth.userId && parsed.data.role && parsed.data.role !== 'admin') {
    return NextResponse.json({ error: 'No podés quitarte tu propio rol de admin' }, { status: 400 })
  }
  // ...nor deactivate themselves
  if (id === auth.userId && parsed.data.is_active === false) {
    return NextResponse.json({ error: 'No podés desactivar tu propia cuenta' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) update.display_name = parsed.data.name
  if (parsed.data.role !== undefined) update.role = parsed.data.role
  if (parsed.data.is_active !== undefined) update.is_active = parsed.data.is_active
  if (parsed.data.color !== undefined) update.color = parsed.data.color

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .update(update)
    .eq('id', id)
    .select('id, auth_user_id, email, display_name, role, phone, is_active, color, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // Soft delete only — never remove the record. Can't deactivate yourself.
  if (id === auth.userId) {
    return NextResponse.json({ error: 'No podés desactivar tu propia cuenta' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .update({ is_active: false })
    .eq('id', id)
    .select('id, auth_user_id, email, display_name, role, phone, is_active, color, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
