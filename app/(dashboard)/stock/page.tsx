import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Inventory, InventoryMovement, Sale, Product } from '@/lib/types'
import { StockView } from '@/components/stock/StockView'

export default async function StockPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()
  if (!dbUser) redirect('/login')

  const [
    { data: inventory },
    { data: rawMovements },
    { data: encargadas },
    { data: products },
  ] = await Promise.all([
    supabase
      .from('inventory')
      .select('*, product:products(id, name, unit, cost)')
      .order('updated_at', { ascending: false }),
    supabase
      .from('inventory_movements')
      .select('*, product:products(id, name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('sales')
      .select('*, customer:customers(id, name, address), items:sale_items(*, product:products(id, name, unit, cost))')
      .eq('status', 'encargado')
      .order('created_at', { ascending: false }),
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  // Enrich venta movements with sale_number + customer name
  const saleIds = (rawMovements ?? [])
    .filter(m => m.movement_type === 'venta' && m.reference_id)
    .map(m => m.reference_id as string)

  let salesMap = new Map<string, unknown>()
  if (saleIds.length > 0) {
    const { data: saleMeta } = await supabase
      .from('sales')
      .select('id, sale_number, customer:customers(id, name)')
      .in('id', saleIds)
    salesMap = new Map((saleMeta ?? []).map(s => [s.id as string, s]))
  }

  // Resolve movement users (created_by → users) via admin client — RLS hides other users from vendedores
  const userIds = [...new Set(
    (rawMovements ?? []).map(m => m.created_by).filter((v): v is string => !!v)
  )]
  let userMap: Record<string, { id: string; display_name: string; color: string | null }> = {}
  if (userIds.length > 0) {
    const admin = createAdminClient()
    const { data: movUsers } = await admin
      .from('users')
      .select('id, display_name, color')
      .in('id', userIds)
    userMap = Object.fromEntries((movUsers ?? []).map(u => [u.id, u]))
  }

  const movements: InventoryMovement[] = (rawMovements ?? []).map(m => ({
    ...m,
    sale: m.reference_id ? (salesMap.get(m.reference_id) ?? null) : null,
    user: m.created_by ? (userMap[m.created_by] ?? null) : null,
  })) as InventoryMovement[]

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Stock</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Inventario en heladeras de Nico
        </p>
      </div>
      <StockView
        inventory={(inventory as Inventory[]) ?? []}
        movements={movements}
        encargadas={(encargadas as Sale[]) ?? []}
        products={(products as Product[]) ?? []}
        role={dbUser.role as 'admin' | 'vendedor'}
      />
    </div>
  )
}
