import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSaleSchema, validationError } from '@/lib/validations'

const SALE_WITH_JOINS = `
  *,
  customer:customers(id, name),
  seller:users(id, display_name),
  items:sale_items(*, product:products(id, name, unit))
` as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await request.json()
  const parsed = createSaleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch real prices from DB — never trust client prices
  const productIds = parsed.data.items.map(i => i.product_id)
  const { data: dbProducts, error: productError } = await admin
    .from('products')
    .select('id, price')
    .in('id', productIds)

  if (productError || !dbProducts) {
    return NextResponse.json({ error: 'Error al obtener precios' }, { status: 500 })
  }

  const priceMap = Object.fromEntries(dbProducts.map(p => [p.id, p.price as number]))

  const items = parsed.data.items.map(item => ({
    product_id: item.product_id,
    quantity: item.quantity,
    quantity_requested: item.quantity_requested ?? item.quantity,
    unit_price: priceMap[item.product_id] ?? item.unit_price,
    subtotal: (priceMap[item.product_id] ?? item.unit_price) * item.quantity,
  }))

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const discount = parsed.data.discount ?? 0
  const total = subtotal - discount

  const { data: sale, error: saleError } = await admin
    .from('sales')
    .insert({
      customer_id: parsed.data.customer_id,
      order_id: parsed.data.order_id ?? null,
      sale_type: parsed.data.sale_type ?? 'reparto',
      status: parsed.data.status ?? 'pedir',
      subtotal,
      discount,
      total,
      payment_method: null,
      payment_status: 'pendiente',
      supplier_payment_status: 'por_pagar',
      notes: parsed.data.notes ?? null,
      sold_by: dbUser.id,
    })
    .select()
    .single()

  if (saleError || !sale) {
    return NextResponse.json({ error: saleError?.message ?? 'Error al crear venta' }, { status: 500 })
  }

  const { error: itemsError } = await admin
    .from('sale_items')
    .insert(items.map(i => ({ ...i, sale_id: sale.id })))

  if (itemsError) {
    await admin.from('sales').delete().eq('id', sale.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  const { data: fullSale } = await admin
    .from('sales')
    .select(SALE_WITH_JOINS)
    .eq('id', sale.id)
    .single()

  return NextResponse.json(fullSale ?? sale, { status: 201 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const deliveryStatus = searchParams.get('status')
  const paymentStatus = searchParams.get('payment')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  let query = supabase
    .from('sales')
    .select(SALE_WITH_JOINS)
    .order('created_at', { ascending: false })

  if (deliveryStatus) query = query.eq('delivery_status', deliveryStatus)
  if (paymentStatus) query = query.eq('payment_status', paymentStatus)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
