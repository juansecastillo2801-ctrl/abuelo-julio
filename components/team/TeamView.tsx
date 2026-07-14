'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import type { User } from '@/lib/types'
import { UserDialog } from './UserDialog'

interface TeamViewProps {
  users: User[]
  currentUserId: string
  lastActivity: Record<string, string | null>
}

function RoleBadge({ role }: { role: User['role'] }) {
  const admin = role === 'admin'
  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: '6px',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: admin ? 'var(--accent-glow)' : 'var(--bg-secondary)',
        color: admin ? 'var(--accent-color)' : 'var(--text-muted)',
        border: `1px solid ${admin ? 'var(--accent-color)' : 'var(--border-color)'}`,
      }}
    >
      {admin ? 'Admin' : 'Vendedor'}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge-status ${active ? 'badge-active' : 'badge-inactive'}`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function formatActivity(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function TeamView({ users: initialUsers, currentUserId, lastActivity }: TeamViewProps) {
  const [users, setUsers] = useState(initialUsers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const activeCount = users.filter(u => u.is_active).length
  const inactiveCount = users.length - activeCount

  function handleSaved(user: User) {
    setUsers(prev => {
      const exists = prev.find(u => u.id === user.id)
      return exists ? prev.map(u => u.id === user.id ? user : u) : [...prev, user]
    })
  }

  function openEdit(user: User) {
    setEditing(user)
    setDialogOpen(true)
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Equipo</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Gestión de usuarios del sistema</p>
        </div>
        <button
          className="btn btn-primary"
          style={{ flexShrink: 0 }}
          onClick={() => { setEditing(null); setDialogOpen(true) }}
        >
          Nuevo usuario
        </button>
      </div>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '16px' }}>
        {activeCount} activos · {inactiveCount} inactivos · {users.length} total
      </span>

      {/* Desktop table */}
      <div className="view-desktop">
        <div className="data-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th style={{ textAlign: 'center' }}>Rol</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th>Última actividad</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                    No hay usuarios
                  </td>
                </tr>
              )}
              {users.map(user => (
                <tr key={user.id} style={{ opacity: user.is_active ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 500 }}>
                    {user.display_name}
                    {user.id === currentUserId && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>(vos)</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{user.email}</td>
                  <td style={{ textAlign: 'center' }}><RoleBadge role={user.role} /></td>
                  <td style={{ textAlign: 'center' }}><StatusBadge active={user.is_active} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{formatActivity(lastActivity[user.id])}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-icon btn-sm" title="Editar" onClick={() => openEdit(user)}>
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="view-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {users.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>No hay usuarios</p>
        )}
        {users.map(user => (
          <div
            key={user.id}
            onClick={() => openEdit(user)}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '12px 14px',
              cursor: 'pointer',
              opacity: user.is_active ? 1 : 0.5,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.display_name}
                {user.id === currentUserId && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>(vos)</span>
                )}
              </span>
              <RoleBadge role={user.role} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StatusBadge active={user.is_active} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Últ. actividad: {formatActivity(lastActivity[user.id])}
              </span>
            </div>
          </div>
        ))}
      </div>

      {dialogOpen && (
        <UserDialog
          user={editing}
          users={users}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
