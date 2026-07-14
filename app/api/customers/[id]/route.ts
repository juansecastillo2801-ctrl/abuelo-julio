import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateCustomerSchema, validationError } from '@/lib/validations'
import { evaluateCustomerCompleteness } from '@/lib/utils'

const patchSchema = updateCustomerSchema.merge(
  z.object({ is_active: z.boolean().optional() })
)

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const, role: null }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) return { error: 'Acceso denegado', status: 403 as const, role: null }

  return { error: null, status: null, role: dbUser.role as string }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 })
  }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('customers')
    .select('name, address')
    .eq('id', id)
    .single()

  const newName = (parsed.data.name ?? current?.name ?? '') as string
  const newAddress = (parsed.data.address ?? current?.address ?? '') as string
  const reviewData = evaluateCustomerCompleteness(newName, newAddress)

  const { data, error } = await admin
    .from('customers')
    .update({ ...parsed.data, ...reviewData })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden eliminar clientes' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
