'use client'

import { useState } from 'react'
import { X, RefreshCw, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { SELLER_COLORS, type User, type Role } from '@/lib/types'

interface UserDialogProps {
  user: User | null
  users: User[]
  onClose: () => void
  onSaved: (user: User) => void
}

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  const values = new Uint32Array(12)
  crypto.getRandomValues(values)
  for (let i = 0; i < values.length; i++) out += chars[values[i] % chars.length]
  return out
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function UserDialog({ user, users, onClose, onSaved }: UserDialogProps) {
  const isEdit = !!user

  // Colores en uso por OTROS usuarios activos → hex -> nombre del usuario
  const usedByOther: Record<string, string> = {}
  for (const u of users) {
    if (u.is_active && u.color && u.id !== user?.id) usedByOther[u.color] = u.display_name
  }
  const firstFreeColor = SELLER_COLORS.find(c => !usedByOther[c.hex])?.hex ?? SELLER_COLORS[0].hex

  const [name, setName] = useState(user?.display_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(user?.role ?? 'vendedor')
  const [isActive, setIsActive] = useState(user?.is_active ?? true)
  const [color, setColor] = useState<string>(user?.color ?? firstFreeColor)
  const [loading, setLoading] = useState(false)

  // Post-creation credentials screen
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isEdit) {
      if (!EMAIL_RE.test(email.trim())) {
        toast.error('Ingresá un email válido')
        return
      }
      if (password.length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres')
        return
      }
    }

    setLoading(true)
    try {
      const url = isEdit ? `/api/team/${user!.id}` : '/api/team'
      const method = isEdit ? 'PATCH' : 'POST'
      const body = isEdit
        ? { name, role, is_active: isActive, color }
        : { name, email: email.trim(), password, role, color }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }
      const saved: User = await res.json()
      onSaved(saved)

      if (isEdit) {
        toast.success('Usuario actualizado')
        onClose()
      } else {
        setCredentials({ email: email.trim(), password })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  async function copyCredentials() {
    if (!credentials) return
    try {
      await navigator.clipboard.writeText(`${credentials.email} / ${credentials.password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  // ── Credentials screen (after creating) ──
  if (credentials) {
    return (
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal-box">
          <div className="modal-header">
            <h2 className="modal-title">Usuario creado</h2>
            <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Compartile estas credenciales al nuevo usuario para que pueda ingresar:
          </p>

          <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{credentials.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Contraseña</span>
              <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>{credentials.password}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={copyCredentials}>
              {copied ? <><Check size={15} style={{ marginRight: '6px' }} /> Copiado</> : <><Copy size={15} style={{ marginRight: '6px' }} /> Copiar</>}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>Listo</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Create / edit form ──
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Nombre completo *</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Ej: Juan Pérez"
            />
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="form-label">Email *</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="usuario@email.com"
                />
              </div>

              <div>
                <label className="form-label">Contraseña temporal *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => setPassword(generatePassword())}
                    title="Generar contraseña"
                  >
                    <RefreshCw size={14} style={{ marginRight: '6px' }} /> Generar
                  </button>
                </div>
              </div>
            </>
          )}

          {isEdit && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', fontSize: '13px', color: 'var(--text-muted)' }}>
              {user!.email}
            </div>
          )}

          <div>
            <label className="form-label">Rol</label>
            <select
              className="form-input"
              value={role}
              onChange={e => setRole(e.target.value as Role)}
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Color del vendedor */}
          <div>
            <label className="form-label">Color del vendedor</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
              {SELLER_COLORS.map(c => {
                const takenBy = usedByOther[c.hex]
                const selected = color === c.hex
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={takenBy ? `En uso por ${takenBy}` : c.name}
                    disabled={!!takenBy}
                    onClick={() => { if (!takenBy) setColor(c.hex) }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      cursor: takenBy ? 'not-allowed' : 'pointer',
                      opacity: takenBy ? 0.35 : 1,
                      border: selected ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: selected ? '0 0 0 1px var(--border-color)' : 'none',
                      padding: 0,
                      flexShrink: 0,
                    }}
                  />
                )
              })}
            </div>
            {SELLER_COLORS.filter(c => usedByOther[c.hex]).map(c => (
              <p key={c.hex} style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                El {c.name} está en uso por {usedByOther[c.hex]}
              </p>
            ))}
          </div>

          {isEdit && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '2px' }}>Estado</label>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {isActive ? 'La cuenta puede iniciar sesión' : 'La cuenta está desactivada'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                aria-pressed={isActive}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: isActive ? 'var(--accent-color)' : 'var(--border-color)',
                  transition: 'background-color 0.15s',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '3px',
                  left: isActive ? '23px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.15s',
                }} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
