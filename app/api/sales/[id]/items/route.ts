import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const patchItemsSchema = z.object({
  items: z.array(z.object({
    item_id: z.string().uuid(),
    quantity: z.number().positive(),
  })).min(1),
})

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const parsed = patchItemsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch current items to get unit_prices
  const { data: currentItems, error: fetchError } = await admin
    .from('sale_items')
    .select('id, unit_price, sale_id')
    .in('id', parsed.data.items.map(i => i.item_id))

  if (fetchError || !currentItems) {
    return NextResponse.json({ error: 'Error al obtener items' }, { status: 500 })
  }

  // Verify all items belong to this sale
  const allBelongToSale = currentItems.every(i => i.sale_id === id)
  if (!allBelongToSale) {
    return NextResponse.json({ error: 'Items no pertenecen a esta venta' }, { status: 400 })
  }

  const priceMap = Object.fromEntries(currentItems.map(i => [i.id, i.unit_price as number]))

  // Update each item
  for (const { item_id, quantity } of parsed.data.items) {
    const subtotal = (priceMap[item_id] ?? 0) * quantity
    const { error } = await admin
      .from('sale_items')
      .update({ quantity, subtotal })
      .eq('id', item_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Recalculate sale totals
  const { data: updatedItems, error: itemsError } = await admin
    .from('sale_items')
    .select('subtotal')
    .eq('sale_id', id)

  if (itemsError || !updatedItems) {
    return NextResponse.json({ error: 'Error al recalcular totales' }, { status: 500 })
  }

  const subtotal = updatedItems.reduce((sum, i) => sum + (i.subtotal as number), 0)

  const { data: sale, error: saleError } = await admin
    .from('sales')
    .select('discount')
    .eq('id', id)
    .single()

  if (saleError || !sale) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  }

  const total = subtotal - (sale.discount as number)

  const { error: updateError } = await admin
    .from('sales')
    .update({ subtotal, total })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, subtotal, total })
}
