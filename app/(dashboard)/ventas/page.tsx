import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Sale, Customer, Product } from '@/lib/types'
import { SalesTable } from '@/components/sales/SalesTable'

export default async function VentasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) redirect('/login')

  const [{ data: sales }, { data: customers }, { data: products }] = await Promise.all([
    supabase
      .from('sales')
      .select(`
        *,
        customer:customers(id, name, address),
        items:sale_items(*, product:products(id, name, unit, cost))
      `)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  // Resolve seller names via admin client (users RLS hides other users from vendedores)
  const salesList = (sales as Sale[]) ?? []
  const sellerIds = [...new Set(salesList.map(s => s.sold_by).filter((v): v is string => !!v))]
  let sellerMap: Record<string, { id: string; display_name: string; color: string | null }> = {}
  if (sellerIds.length > 0) {
    const admin = createAdminClient()
    const { data: sellers } = await admin
      .from('users')
      .select('id, display_name, color')
      .in('id', sellerIds)
    sellerMap = Object.fromEntries((sellers ?? []).map(u => [u.id, u]))
  }
  const salesWithSeller = salesList.map(s => ({
    ...s,
    seller: s.sold_by ? sellerMap[s.sold_by] ?? null : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Ventas</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Registro y seguimiento de ventas</p>
      </div>
      <SalesTable
        sales={salesWithSeller}
        customers={(customers as Customer[]) ?? []}
        products={(products as Product[]) ?? []}
        isAdmin={dbUser.role === 'admin'}
      />
    </div>
  )
}
