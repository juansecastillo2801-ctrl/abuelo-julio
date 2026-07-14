import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SALE_WITH_JOINS = `
  *,
  customer:customers(id, name, address),
  items:sale_items(*, product:products(id, name, unit, cost))
` as const

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) return { error: 'Acceso denegado', status: 403 as const }

  return { error: null, status: null }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const { data: sale, error: fetchError } = await admin
    .from('sales')
    .select('status, previous_status')
    .eq('id', id)
    .single()

  if (fetchError || !sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  if (sale.status !== 'cancelado') {
    return NextResponse.json({ error: 'Solo se pueden reactivar ventas canceladas' }, { status: 400 })
  }

  const targetStatus = (sale.previous_status as string) ?? 'pedir'

  const update: Record<string, unknown> = {
    status: targetStatus,
    previous_status: null,
  }

  // Restore delivery timestamp if going back to entregado
  if (targetStatus === 'entregado') {
    update.delivered_at = new Date().toISOString()
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
