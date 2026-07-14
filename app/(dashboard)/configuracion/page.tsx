import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConfigView } from '@/components/config/ConfigView'

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Accesible para admin y vendedor — todos pueden cambiar su contraseña
  const { data: dbUser } = await supabase
    .from('users')
    .select('display_name, email, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Configuración</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Tu cuenta y seguridad</p>
      </div>
      <ConfigView
        name={dbUser.display_name}
        email={dbUser.email}
        role={dbUser.role as 'admin' | 'vendedor'}
      />
    </div>
  )
}
