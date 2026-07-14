'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface ConfigViewProps {
  name: string
  email: string
  role: 'admin' | 'vendedor'
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '20px',
}

const inputStyle: React.CSSProperties = { minHeight: '44px' }

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export function ConfigView({ name, email, role }: ConfigViewProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const mismatch = repeatPassword.length > 0 && newPassword !== repeatPassword
  const tooShort = newPassword.length > 0 && newPassword.length < 8

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== repeatPassword) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Verificar la contraseña actual re-autenticando con el email del usuario
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (signInError) {
        toast.error('La contraseña actual es incorrecta')
        setLoading(false)
        return
      }

      // 2. Actualizar a la nueva contraseña
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        toast.error(updateError.message ?? 'No se pudo actualizar la contraseña')
        setLoading(false)
        return
      }

      toast.success('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setRepeatPassword('')
    } catch {
      toast.error('Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const roleLabel = role === 'admin' ? 'Admin' : 'Vendedor'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
      {/* Mi cuenta */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Mi cuenta</h2>
        <InfoRow label="Nombre" value={name} />
        <InfoRow label="Email" value={email} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Rol</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{roleLabel}</span>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Cambiar contraseña</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Ingresá tu contraseña actual y elegí una nueva de al menos 8 caracteres.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Contraseña actual</label>
            <input
              className="form-input"
              type="password"
              style={inputStyle}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="form-label">Nueva contraseña</label>
            <input
              className="form-input"
              type="password"
              style={inputStyle}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
            />
            {tooShort && (
              <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px' }}>
                Debe tener al menos 8 caracteres.
              </p>
            )}
          </div>

          <div>
            <label className="form-label">Repetir nueva contraseña</label>
            <input
              className="form-input"
              type="password"
              style={inputStyle}
              value={repeatPassword}
              onChange={e => setRepeatPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
            {mismatch && (
              <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px' }}>
                Las contraseñas no coinciden.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '44px' }}
            disabled={loading || mismatch || tooShort || !currentPassword || !newPassword || !repeatPassword}
          >
            {loading ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
