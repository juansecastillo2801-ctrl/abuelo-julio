import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const receiveSchema = z.object({
  items: z.array(z.object({
    item_id: z.string().uuid(),
    quantity_received: z.number().min(0),
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const parsed = receiveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch sale with items
  const { data: sale, error: fetchError } = await admin
    .from('sales')
    .select('id, status, discount, sale_items(id, product_id, unit_price, subtotal, quantity)')
    .eq('id', id)
    .single()

  if (fetchError || !sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  if (sale.status !== 'encargado') {
    return NextResponse.json({ error: 'La venta no está en estado encargado' }, { status: 400 })
  }

  // Map existing items by id
  type ExistingItem = { id: string; product_id: string; unit_price: number; subtotal: number; quantity: number }
  const itemMap = new Map<string, ExistingItem>(
    (sale.sale_items as ExistingItem[]).map(item => [item.id, item])
  )

  // Build received map
  const receivedMap = new Map(
    parsed.data.items.map(r => [r.item_id, r.quantity_received])
  )

  // Calculate new subtotal and collect inventory updates
  let newSubtotal = 0
  const inventoryUpdates: Array<{ product_id: string; quantity: number }> = []

  for (const item of sale.sale_items as ExistingItem[]) {
    const receivedQty = receivedMap.get(item.id)
    if (receivedQty !== undefined) {
      const newItemSubtotal = receivedQty * item.unit_price
      newSubtotal += newItemSubtotal
      inventoryUpdates.push({ product_id: item.product_id, quantity: receivedQty })

      // Update sale_item quantity and subtotal
      const { error: itemError } = await admin
        .from('sale_items')
        .update({ quantity: receivedQty, subtotal: newItemSubtotal })
        .eq('id', item.id)
      if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })
    } else {
      // Item not in received list — keep current subtotal
      newSubtotal += item.subtotal
    }
  }

  const newTotal = Math.max(0, newSubtotal - (sale.discount ?? 0))

  // Update sale status + financials
  const { error: saleError } = await admin
    .from('sales')
    .update({ status: 'almacenado', subtotal: newSubtotal, total: newTotal })
    .eq('id', id)
  if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 })

  // Insert inventory movements + update current_stock for each product
  for (const update of inventoryUpdates) {
    if (update.quantity <= 0) continue

    // Insert movement
    const { error: movError } = await admin
      .from('inventory_movements')
      .insert({
        product_id: update.product_id,
        quantity: update.quantity,
        movement_type: 'compra',
        reference_id: id,
        notes: 'Recepción de pedido encargado',
      })
    if (movError) return NextResponse.json({ error: movError.message }, { status: 500 })

    // Read current stock then update
    const { data: inv } = await admin
      .from('inventory')
      .select('current_stock')
      .eq('product_id', update.product_id)
      .single()

    const newStock = (inv?.current_stock ?? 0) + update.quantity

    const { error: invError } = await admin
      .from('inventory')
      .update({ current_stock: newStock, last_restock_at: new Date().toISOString() })
      .eq('product_id', update.product_id)
    if (invError) return NextResponse.json({ error: invError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
