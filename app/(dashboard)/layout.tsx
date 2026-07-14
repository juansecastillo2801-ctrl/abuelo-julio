import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardTopbar } from '@/components/layout/DashboardTopbar'
import { DashboardBottomNav } from '@/components/layout/DashboardBottomNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('role, display_name, is_active')
    .eq('auth_user_id', user.id)
    .single()

  if (!appUser?.is_active) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <DashboardTopbar
        userName={appUser.display_name}
        role={appUser.role as 'admin' | 'vendedor'}
      />
      <main className="page-content pb-20 md:pb-0">
        {children}
      </main>
      <DashboardBottomNav role={appUser.role} />
    </div>
  )
}
