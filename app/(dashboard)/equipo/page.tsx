import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@/lib/types'
import { TeamView } from '@/components/team/TeamView'

export default async function EquipoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  // Solo admins gestionan el equipo
  if (!dbUser || dbUser.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  const [{ data: users }, { data: activityRows }] = await Promise.all([
    admin
      .from('users')
      .select('id, auth_user_id, email, display_name, role, phone, is_active, color, created_at')
      .order('created_at', { ascending: true }),
    admin
      .from('audit_logs')
      .select('user_id, created_at')
      .order('created_at', { ascending: false }),
  ])

  // Latest audit entry per user → última actividad
  const lastActivity: Record<string, string | null> = {}
  for (const row of activityRows ?? []) {
    if (row.user_id && !(row.user_id in lastActivity)) {
      lastActivity[row.user_id] = row.created_at
    }
  }

  return (
    <div className="space-y-6">
      <TeamView
        users={(users as User[]) ?? []}
        currentUserId={dbUser.id}
        lastActivity={lastActivity}
      />
    </div>
  )
}
