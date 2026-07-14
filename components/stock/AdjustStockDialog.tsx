'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Inventory } from '@/lib/types'
import { formatWeight } from '@/lib/utils'

interface Props {
  inventory: Inventory
  onClose: () => void
  onSuccess: () => void
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: '6px',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '14px',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export function AdjustStockDialog({ inventory, onClose, onSuccess }: Props) {
  const [realStock, setRealStock] = useState(String(inventory.current_stock))
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const currentStock = inventory.current_stock
  const parsedReal = parseFloat(realStock)
  const difference = isNaN(parsedReal) ? null : parsedReal - currentStock
  const hasDifference = difference !== null && difference !== 0

  async function submit() {
    if (isNaN(parsedReal) || parsedReal < 0) {
      toast.error('El stock real debe ser un número válido')
      return
    }
    if (!reason.trim()) {
      toast.error('El motivo es obligatorio')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: inventory.product_id,
          real_stock: parsedReal,
          reason: reason.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error')
      }
      toast.success('Stock ajustado correctamente')
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al ajustar stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Ajustar stock</h2>
          <button className="btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Product name */}
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '2px' }}>Producto</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {inventory.product?.name ?? '—'}
            </p>
          </div>

          {/* Current stock */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              Stock actual del sistema
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {formatWeight(currentStock)}
            </p>
          </div>

          {/* Real stock input */}
          <div>
            <label style={LABEL_STYLE}>Stock real contado (kg) *</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={realStock}
              onChange={e => setRealStock(e.target.value)}
              style={INPUT_STYLE}
              autoFocus
            />
          </div>

          {/* Difference indicator */}
          {hasDifference && difference !== null && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: difference > 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${difference > 0 ? 'var(--success-border)' : 'var(--danger-border)'}`,
            }}>
              <p style={{
                fontSize: '14px',
                fontWeight: 600,
                color: difference > 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                Diferencia: {difference > 0 ? '+' : ''}{difference.toFixed(1)} kg
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {difference > 0 ? 'Se sumará stock' : 'Se restará stock'}
              </p>
            </div>
          )}
          {difference === 0 && !isNaN(parsedReal) && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Sin diferencia — el stock no cambiará
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label style={LABEL_STYLE}>Motivo del ajuste *</label>
            <textarea
              placeholder="Ej: Conteo físico, merma, error de carga..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: '64px' }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={submit}
              disabled={!realStock || isNaN(parsedReal) || parsedReal < 0 || !reason.trim() || loading}
            >
              {loading ? 'Ajustando...' : 'Confirmar ajuste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
