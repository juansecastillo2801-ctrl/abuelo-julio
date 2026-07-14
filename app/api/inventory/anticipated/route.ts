import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const anticipatedSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const, userId: null }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) return { error: 'Acceso denegado', status: 403 as const, userId: null }
  if (dbUser.role !== 'admin') return { error: 'Solo admins pueden registrar ingresos anticipados', status: 403 as const, userId: null }
  return { error: null, status: null, userId: dbUser.id as string }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const parsed = anticipatedSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { product_id, quantity, cost, notes } = parsed.data
  const admin = createAdminClient()

  // Update product cost if provided and different
  if (cost != null) {
    const { data: product } = await admin
      .from('products')
      .select('cost')
      .eq('id', product_id)
      .single()

    if (product && product.cost !== cost) {
      const { error: costError } = await admin
        .from('products')
        .update({ cost })
        .eq('id', product_id)
      if (costError) return NextResponse.json({ error: costError.message }, { status: 500 })
    }
  }

  // Read current stock
  const { data: inv } = await admin
    .from('inventory')
    .select('current_stock')
    .eq('product_id', product_id)
    .single()

  const newStock = (inv?.current_stock ?? 0) + quantity

  // Update inventory
  const { error: invError } = await admin
    .from('inventory')
    .update({ current_stock: newStock, last_restock_at: new Date().toISOString() })
    .eq('product_id', product_id)
  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 })

  // Insert movement
  const movementNotes = notes
    ? `Ingreso anticipado: ${notes}`
    : 'Ingreso anticipado'

  const { error: movError } = await admin
    .from('inventory_movements')
    .insert({
      product_id,
      quantity,
      movement_type: 'compra',
      reference_id: null,
      notes: movementNotes,
      created_by: auth.userId,
    })
  if (movError) return NextResponse.json({ error: movError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
