import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Customer } from '@/lib/types'
import { CustomersTable } from '@/components/customers/CustomersTable'

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) redirect('/login')

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('customer_number', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Clientes</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Base de clientes del negocio</p>
      </div>
      <CustomersTable customers={(customers as Customer[]) ?? []} />
    </div>
  )
}
