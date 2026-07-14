import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/lib/types'
import { ProductsTable } from '@/components/products/ProductsTable'

export default async function ProductosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) redirect('/login')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Productos</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Catálogo de cortes y productos</p>
      </div>
      <ProductsTable
        products={(products as Product[]) ?? []}
        isAdmin={dbUser.role === 'admin'}
      />
    </div>
  )
}
