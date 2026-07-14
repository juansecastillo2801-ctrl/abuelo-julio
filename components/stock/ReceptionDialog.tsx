'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Sale } from '@/lib/types'
import { formatWeight } from '@/lib/utils'

interface Props {
  encargadas: Sale[]
  onClose: () => void
  onSuccess: () => void
}

function padNum(n: number) {
  return `#${String(n).padStart(3, '0')}`
}

const INPUT_STYLE: React.CSSProperties = {
  width: '72px',
  padding: '6px 8px',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  textAlign: 'center',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
}

export function ReceptionDialog({ encargadas, onClose, onSuccess }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const sale of encargadas) {
      for (const item of sale.items ?? []) {
        initial[item.id] = String(item.quantity_requested ?? item.quantity)
      }
    }
    return initial
  })
  const [loading, setLoading] = useState(false)

  const selectedSales = encargadas.filter(s => checked[s.id])

  const totalKg = selectedSales.reduce((sum, sale) => {
    return sum + (sale.items ?? []).reduce((acc, item) => {
      return acc + (parseFloat(quantities[item.id] ?? '0') || 0)
    }, 0)
  }, 0)

  function toggleSale(saleId: string) {
    setChecked(prev => ({ ...prev, [saleId]: !prev[saleId] }))
  }

  async function confirm() {
    if (selectedSales.length === 0) return
    setLoading(true)
    try {
      await Promise.all(selectedSales.map(async (sale) => {
        const items = (sale.items ?? []).map(item => ({
          item_id: item.id,
          quantity_received: parseFloat(quantities[item.id] ?? '0') || 0,
        }))
        const res = await fetch(`/api/sales/${sale.id}/receive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(`${padNum(sale.sale_number)}: ${err.error ?? 'Error'}`)
        }
      }))
      toast.success(
        `${selectedSales.length} pedido${selectedSales.length === 1 ? '' : 's'} recibido${selectedSales.length === 1 ? '' : 's'} correctamente`
      )
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar recepción')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay modal-fullscreen-mobile"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-box" style={{
        maxWidth: '520px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90dvh',
        padding: 0,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', flexShrink: 0, borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Recepción de pedidos
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Tildá las ventas que llegaron y confirmá los kilos reales
              </p>
            </div>
            <button className="btn btn-icon btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {/* Sale list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {encargadas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No hay pedidos encargados pendientes de recibir
            </div>
          ) : (
            encargadas.map(sale => {
              const isChecked = !!checked[sale.id]
              const itemsKg = (sale.items ?? []).reduce(
                (sum, item) => sum + (parseFloat(quantities[item.id] ?? '0') || 0),
                0
              )
              return (
                <div
                  key={sale.id}
                  style={{
                    border: `1px solid ${isChecked ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    borderRadius: '12px',
                    marginBottom: '10px',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Card header row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      backgroundColor: isChecked ? 'var(--accent-glow)' : 'transparent',
                      userSelect: 'none',
                    }}
                    onClick={() => toggleSale(sale.id)}
                  >
                    {/* Custom checkbox */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '5px',
                      border: `2px solid ${isChecked ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      backgroundColor: isChecked ? 'var(--accent-color)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px',
                      transition: 'all 0.15s',
                    }}>
                      {isChecked && (
                        <span style={{ color: 'var(--bg-primary)', fontSize: '12px', fontWeight: 700, lineHeight: 1 }}>✓</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '3px' }}>
                        {padNum(sale.sale_number)} · {sale.customer?.name}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {(sale.items ?? []).map(i =>
                          `${i.quantity_requested ?? i.quantity}kg ${i.product?.name ?? ''}`
                        ).join(' + ')}
                      </p>
                      {isChecked && (
                        <p style={{ fontSize: '12px', color: 'var(--accent-color)', marginTop: '5px', fontWeight: 500 }}>
                          Recibiendo {formatWeight(itemsKg)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded item rows */}
                  {isChecked && (
                    <div style={{
                      borderTop: '1px solid var(--border-color)',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}>
                      {(sale.items ?? []).map(item => (
                        <div
                          key={item.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {item.product?.name}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                              Pedido: {item.quantity_requested ?? item.quantity} kg
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Recibido:</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={quantities[item.id] ?? ''}
                              onChange={e => setQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              style={INPUT_STYLE}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          padding: '16px 20px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: 'var(--bg-secondary)',
        }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedSales.length === 0
                ? 'Ninguna venta seleccionada'
                : `${selectedSales.length} ${selectedSales.length === 1 ? 'venta seleccionada' : 'ventas seleccionadas'}`}
            </p>
            {selectedSales.length > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {formatWeight(totalKg)} totales
              </p>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={confirm}
            disabled={selectedSales.length === 0 || loading}
            style={{ minWidth: '160px' }}
          >
            {loading ? 'Confirmando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  )
}
