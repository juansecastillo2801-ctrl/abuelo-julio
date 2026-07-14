'use client'

import { useRouter } from 'next/navigation'
import { Beef, UsersRound, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  role: string
  onClose: () => void
}

export function MoreMenuSheet({ role, onClose }: Props) {
  const router = useRouter()
  const isAdmin = role === 'admin'

  function navigate(href: string) {
    onClose()
    router.push(href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    onClose()
    router.push('/login')
  }

  return (
    <>
      {/* Overlay */}
      <div className="sheet-overlay" onClick={onClose} />

      {/* Sheet */}
      <div className="sheet-container">
        <div className="sheet-header">
          <span className="sheet-title">Más opciones</span>
          <button className="btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <div>
          <button className="sheet-item" onClick={() => navigate('/productos')}>
            <Beef size={20} />
            Productos
          </button>

          {isAdmin && (
            <button className="sheet-item" onClick={() => navigate('/equipo')}>
              <UsersRound size={20} />
              Equipo
            </button>
          )}

          <button className="sheet-item" onClick={() => navigate('/configuracion')}>
            <Settings size={20} />
            Configuración
          </button>

          <button className="sheet-item danger" onClick={handleLogout}>
            <LogOut size={20} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}
