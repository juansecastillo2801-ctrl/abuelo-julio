import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const adjustSchema = z.object({
  product_id: z.string().uuid(),
  real_stock: z.number().min(0),
  reason: z.string().min(1).max(500),
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
  if (dbUser.role !== 'admin') return { error: 'Solo admins pueden ajustar stock', status: 403 as const, userId: null }
  return { error: null, status: null, userId: dbUser.id as string }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const parsed = adjustSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { product_id, real_stock, reason } = parsed.data
  const admin = createAdminClient()

  // Read current stock to compute the difference
  const { data: inv, error: fetchError } = await admin
    .from('inventory')
    .select('current_stock')
    .eq('product_id', product_id)
    .single()

  if (fetchError || !inv) return NextResponse.json({ error: 'Producto no encontrado en inventario' }, { status: 404 })

  const difference = real_stock - inv.current_stock

  // Update inventory
  const { error: invError } = await admin
    .from('inventory')
    .update({ current_stock: real_stock })
    .eq('product_id', product_id)
  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 })

  // Insert movement (even if difference = 0, to record the count)
  const { error: movError } = await admin
    .from('inventory_movements')
    .insert({
      product_id,
      quantity: difference,
      movement_type: 'ajuste',
      reference_id: null,
      notes: reason,
      created_by: auth.userId,
    })
  if (movError) return NextResponse.json({ error: movError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
