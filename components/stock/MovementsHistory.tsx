'use client'

import { useState } from 'react'
import type { InventoryMovement, MovementType } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface Props {
  movements: InventoryMovement[]
}

type MovFilter = 'todos' | 'compras' | 'ventas' | 'ajustes' | '7d' | '30d'

const MOV_LABELS: Record<MovementType, string> = {
  compra: 'Compra',
  venta: 'Venta',
  ajuste: 'Ajuste',
  merma: 'Merma',
}

function MovTypeBadge({ type }: { type: MovementType }) {
  const colors: Record<MovementType, { bg: string; color: string }> = {
    compra: { bg: 'var(--success-bg)', color: 'var(--success)' },
    venta: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
    ajuste: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    merma: { bg: 'var(--purple-bg)', color: 'var(--purple)' },
  }
  const c = colors[type] ?? colors.ajuste
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: c.bg,
      color: c.color,
    }}>
      {MOV_LABELS[type]}
    </span>
  )
}

function QuantityCell({ quantity }: { quantity: number }) {
  const isPositive = quantity >= 0
  return (
    <span style={{
      fontWeight: 600,
      color: isPositive ? 'var(--success)' : 'var(--danger)',
      whiteSpace: 'nowrap',
    }}>
      {isPositive ? '+' : ''}{quantity % 1 === 0 ? quantity : quantity.toFixed(1)} kg
    </span>
  )
}

function ReferenceCell({ movement: m, mobile }: { movement: InventoryMovement; mobile?: boolean }) {
  if (m.movement_type === 'venta' && m.sale) {
    const saleRef = `Venta #${String(m.sale.sale_number).padStart(3, '0')}`
    // Supabase may return the joined customer as an object or single-element array
    const customerRaw = m.sale.customer
    const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw
    const customerName = customer?.name
    return (
      <p style={{
        fontSize: '13px',
        color: 'var(--text-muted)',
        marginTop: mobile ? '4px' : 0,
        overflow: mobile ? 'hidden' : undefined,
        textOverflow: mobile ? 'ellipsis' : undefined,
        whiteSpace: mobile ? 'nowrap' : undefined,
      }}>
        {saleRef}{customerName ? ` - ${customerName}` : ''}
      </p>
    )
  }
  if (!m.notes && !mobile) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  if (!m.notes) return null
  return (
    <p style={{
      fontSize: '12px',
      color: 'var(--text-muted)',
      marginTop: mobile ? '4px' : 0,
    }}>
      {m.notes}
    </p>
  )
}

const MOV_FILTERS: { key: MovFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'compras', label: 'Compras' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'ajustes', label: 'Ajustes' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
]

function isWithinDays(dateString: string, days: number): boolean {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(dateString).getTime() >= cutoff
}

export function MovementsHistory({ movements }: Props) {
  const [movFilter, setMovFilter] = useState<MovFilter>('todos')

  const filtered = movements.filter(m => {
    if (movFilter === 'compras') return m.movement_type === 'compra'
    if (movFilter === 'ventas') return m.movement_type === 'venta'
    if (movFilter === 'ajustes') return m.movement_type === 'ajuste'
    if (movFilter === '7d') return isWithinDays(m.created_at, 7)
    if (movFilter === '30d') return isWithinDays(m.created_at, 30)
    return true
  })

  return (
    <>
      {/* Filter chips */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        overflowY: 'hidden',
        flexWrap: 'nowrap',
        paddingBottom: '4px',
        marginBottom: '16px',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      } as React.CSSProperties}>
        {MOV_FILTERS.map(f => {
          const isActive = movFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setMovFilter(f.key)}
              style={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                minHeight: '36px',
                padding: '6px 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
                backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          No hay movimientos en este filtro
        </div>
      )}

      {/* Mobile cards */}
      <div className="view-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(m => (
          <div
            key={m.id}
            className="stat-card"
            style={{ padding: '12px 14px', ...(m.user?.color ? { borderLeft: `3px solid ${m.user.color}`, overflow: 'hidden' } : {}) }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(m.created_at)}</p>
              <QuantityCell quantity={m.quantity} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                {m.product?.name ?? '—'}
              </p>
              <MovTypeBadge type={m.movement_type} />
            </div>
            <ReferenceCell movement={m} mobile />
            {m.user?.color && m.user?.display_name && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', marginTop: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: m.user.color, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.user.display_name}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="data-table view-desktop" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: '16px', paddingRight: '8px', textAlign: 'left' }}>Fecha</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'left' }}>Producto</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'right' }}>Cantidad</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'center' }}>Tipo</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'left' }}>Referencia</th>
              <th style={{ paddingLeft: '8px', paddingRight: '16px', textAlign: 'left' }}>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '16px', paddingRight: '8px', whiteSpace: 'nowrap' }}>
                  {formatDate(m.created_at)}
                </td>
                <td style={{ fontWeight: 500, paddingLeft: '8px', paddingRight: '8px' }}>
                  {m.product?.name ?? '—'}
                </td>
                <td style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'right' }}>
                  <QuantityCell quantity={m.quantity} />
                </td>
                <td style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'center' }}>
                  <MovTypeBadge type={m.movement_type} />
                </td>
                <td style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '8px', paddingRight: '8px', maxWidth: '220px' }}>
                  <ReferenceCell movement={m} />
                </td>
                <td style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '8px', paddingRight: '16px', whiteSpace: 'nowrap' }}>
                  {m.user?.display_name ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {m.user.color && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: m.user.color, flexShrink: 0 }} />
                      )}
                      {m.user.display_name}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                  No hay movimientos en este filtro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
