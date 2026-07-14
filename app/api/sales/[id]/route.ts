import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateSaleSchema } from '@/lib/validations'

const SALE_WITH_JOINS = `
  *,
  customer:customers(id, name, address),
  seller:users(id, display_name),
  items:sale_items(*, product:products(id, name, unit, cost))
` as const

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
  const parsed = updateSaleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const update: Record<string, unknown> = { ...parsed.data }

  // Status timestamps
  if (parsed.data.status === 'entregado') update.delivered_at = new Date().toISOString()
  if (parsed.data.status && parsed.data.status !== 'entregado') update.delivered_at = null

  // Client payment timestamps
  if (parsed.data.payment_status === 'pagado') update.paid_at = new Date().toISOString()
  if (parsed.data.payment_status === 'pendiente') {
    update.paid_at = null
    if (!('payment_method' in parsed.data)) update.payment_method = null
  }

  // Supplier payment timestamps
  if (parsed.data.supplier_payment_status === 'pagado') update.supplier_paid_at = new Date().toISOString()
  if (parsed.data.supplier_payment_status === 'por_pagar') update.supplier_paid_at = null

  const admin = createAdminClient()

  // Capture current status as previous_status when cancelling
  if (parsed.data.status === 'cancelado') {
    const { data: current } = await admin.from('sales').select('status').eq('id', id).single()
    if (current) update.previous_status = current.status
  }
  // Clear previous_status on any non-cancel status change
  if (parsed.data.status && parsed.data.status !== 'cancelado') {
    update.previous_status = null
  }

  const { data, error } = await admin
    .from('sales')
    .update(update)
    .eq('id', id)
    .select(SALE_WITH_JOINS)
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
    return NextResponse.json({ error: 'Solo admins pueden eliminar ventas' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: sale, error: fetchError } = await admin
    .from('sales')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  if (sale.status !== 'cancelado') {
    return NextResponse.json({ error: 'Solo se pueden eliminar ventas canceladas' }, { status: 400 })
  }

  const { error } = await admin.from('sales').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
