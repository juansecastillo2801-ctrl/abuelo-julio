'use client'

import { useState } from 'react'
import { Plus, Eye, CheckCircle2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Sale, SaleStatus, Customer, Product } from '@/lib/types'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { NewSaleDialog } from './NewSaleDialog'
import { SaleDetailDialog } from './SaleDetailDialog'

type Filter = 'todas' | 'pedir' | 'encargado' | 'almacenado' | 'por-cobrar' | 'por-pagar-aj' | 'cerradas' | 'hoy'

interface SalesTableProps {
  sales: Sale[]
  customers: Customer[]
  products: Product[]
  isAdmin: boolean
}

function padNum(n: number) {
  return `#${String(n).padStart(3, '0')}`
}

function isToday(dateString: string): boolean {
  const d = new Date(dateString)
  const n = new Date()
  return d.toDateString() === n.toDateString()
}

function summarizeItems(items?: Sale['items']): string {
  if (!items || items.length === 0) return '—'
  const s = items.map(i => `${i.quantity}kg ${i.product?.name ?? ''}`).join(', ')
  return s.length > 50 ? s.slice(0, 47) + '...' : s
}

function isClosed(s: Sale) {
  return s.status === 'entregado' && s.payment_status === 'pagado' && s.supplier_payment_status === 'pagado'
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  pedir: 'Por pedir',
  encargado: 'Encargado',
  almacenado: 'En stock',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const NEXT_STATUS: Partial<Record<SaleStatus, SaleStatus>> = {
  pedir: 'encargado',
  encargado: 'almacenado',
  almacenado: 'entregado',
}

const PREV_STATUS: Partial<Record<SaleStatus, SaleStatus>> = {
  encargado: 'pedir',
  almacenado: 'encargado',
  entregado: 'almacenado',
}

function StatusBadge({ status, onClick }: { status: SaleStatus; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <span
      className={`badge-status badge-${status}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer', userSelect: 'none' } : undefined}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function ClientPayBadge({ sale, onClick }: { sale: Sale; onClick?: (e: React.MouseEvent) => void }) {
  const paid = sale.payment_status === 'pagado'
  return (
    <span
      className={`badge-status ${paid ? 'badge-pagado' : 'badge-por-cobrar'}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer', userSelect: 'none' } : undefined}
    >
      {paid ? 'Cobrado' : 'Por cobrar'}
    </span>
  )
}

function SupplierPayBadge({ sale, onClick }: { sale: Sale; onClick?: (e: React.MouseEvent) => void }) {
  const paid = sale.supplier_payment_status === 'pagado'
  return (
    <span
      className={`badge-status ${paid ? 'badge-pagado' : 'badge-por-pagar'}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer', userSelect: 'none' } : undefined}
    >
      {paid ? 'Pagado' : 'Por pagar'}
    </span>
  )
}

// ── Status advancement dialog ────────────────────────────────────────────────
interface StatusDialogProps {
  sale: Sale
  onClose: () => void
  onStatusChange: (sale: Sale) => void
  onNeedDeliveryConfirm: () => void
}

function StatusDialog({ sale, onClose, onStatusChange, onNeedDeliveryConfirm }: StatusDialogProps) {
  const [confirm, setConfirm] = useState<'revert-entregado' | 'cancel' | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const next = NEXT_STATUS[sale.status]
  const prev = PREV_STATUS[sale.status]

  async function patchStatus(newStatus: SaleStatus): Promise<Sale> {
    const res = await fetch(`/api/sales/${sale.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
    return res.json()
  }

  // Simple advance (pedir→encargado, encargado→almacenado): close instantly, then PATCH + toast
  async function advance() {
    if (!next) return
    if (next === 'entregado') { onNeedDeliveryConfirm(); return }
    const fromStatus = sale.status
    onClose()
    try {
      const updated = await patchStatus(next)
      onStatusChange(updated)
      toast.success(`${STATUS_LABELS[next]}`, {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              const reverted = await patchStatus(fromStatus)
              onStatusChange(reverted)
              toast.info(`Revertido a ${STATUS_LABELS[fromStatus]}`)
            } catch { toast.error('No se pudo deshacer') }
          },
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  // Simple revert (non-stock): close instantly, then PATCH + toast
  async function revertSimple() {
    if (!prev) return
    const fromStatus = sale.status
    onClose()
    try {
      const updated = await patchStatus(prev)
      onStatusChange(updated)
      toast.success(`${STATUS_LABELS[prev]}`, {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              const reverted = await patchStatus(fromStatus)
              onStatusChange(reverted)
              toast.info(`Revertido a ${STATUS_LABELS[fromStatus]}`)
            } catch { toast.error('No se pudo deshacer') }
          },
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  // Revert from entregado → almacenado: needs confirmation (restores stock)
  async function revertFromEntregado() {
    setLoading('revert')
    try {
      const updated = await patchStatus('almacenado')
      onStatusChange(updated)
      onClose()
      toast.success('Entrega revertida · Stock repuesto')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al revertir')
    } finally {
      setLoading(null)
    }
  }

  // Cancel: needs confirmation
  async function cancelSale() {
    setLoading('cancel')
    try {
      const updated = await patchStatus('cancelado')
      onStatusChange(updated)
      onClose()
      toast.success('Venta cancelada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cancelar')
    } finally {
      setLoading(null)
    }
  }

  function handleRevert() {
    if (sale.status === 'entregado') setConfirm('revert-entregado')
    else revertSimple()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '360px' }}>
        <div className="modal-header">
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{padNum(sale.sale_number)} · {sale.customer?.name}</p>
            <h2 className="modal-title" style={{ marginTop: '2px' }}>Estado del pedido</h2>
          </div>
          <button className="btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Estado actual</p>
          <StatusBadge status={sale.status} />
        </div>

        {/* Inline confirmation: revert from entregado */}
        {confirm === 'revert-entregado' && (
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--warning-border)', marginBottom: '10px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>¿Revertir entrega?</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Esto va a reponer el stock descontado.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '13px' }} onClick={() => setConfirm(null)}>Cancelar</button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '13px', color: 'var(--warning)', borderColor: 'var(--warning-border)' }}
                onClick={revertFromEntregado}
                disabled={loading === 'revert'}
              >
                {loading === 'revert' ? 'Revirtiendo...' : 'Sí, revertir'}
              </button>
            </div>
          </div>
        )}

        {/* Inline confirmation: cancel sale */}
        {confirm === 'cancel' && (
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--danger-border)', marginBottom: '10px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>¿Cancelar esta venta?</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>No descuenta stock pero queda marcada como cancelada.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '13px' }} onClick={() => setConfirm(null)}>No, volver</button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, fontSize: '13px' }}
                onClick={cancelSale}
                disabled={loading === 'cancel'}
              >
                {loading === 'cancel' ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        )}

        {confirm === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {next && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '15px', minHeight: '52px' }}
                onClick={advance}
              >
                → Avanzar a &quot;{STATUS_LABELS[next]}&quot;
              </button>
            )}

            {prev && (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '13px' }}
                onClick={handleRevert}
              >
                ← Volver a &quot;{STATUS_LABELS[prev]}&quot;
              </button>
            )}

            {sale.status !== 'entregado' && sale.status !== 'cancelado' && (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger-border)', marginTop: '4px', fontSize: '13px' }}
                onClick={() => setConfirm('cancel')}
              >
                Cancelar venta
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Confirm delivery dialog (adjust actual kg) ────────────────────────────────
interface ConfirmDeliveryDialogProps {
  sale: Sale
  onClose: () => void
  onDelivered: (sale: Sale) => void
}

function ConfirmDeliveryDialog({ sale, onClose, onDelivered }: ConfirmDeliveryDialogProps) {
  const [qtys, setQtys] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const item of sale.items ?? []) {
      map[item.id] = item.quantity_requested ?? item.quantity ?? 0
    }
    return map
  })
  const [loading, setLoading] = useState(false)

  const total = (sale.items ?? []).reduce((sum, item) => sum + item.unit_price * (qtys[item.id] ?? 0), 0)

  async function confirm() {
    setLoading(true)
    try {
      const items = (sale.items ?? []).map(item => ({
        item_id: item.id,
        quantity: qtys[item.id] ?? 0,
      }))

      const itemsRes = await fetch(`/api/sales/${sale.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!itemsRes.ok) throw new Error((await itemsRes.json()).error ?? 'Error al actualizar cantidades')

      const res = await fetch(`/api/sales/${sale.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'entregado' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const updated: Sale = await res.json()
      onDelivered(updated)
      toast.success('Entregado y stock descontado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay modal-fullscreen-mobile" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Confirmar entrega</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {sale.customer?.name} · {padNum(sale.sale_number)}
            </p>
          </div>
          <button className="btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Ingresá los kilos reales pesados antes de entregar al cliente.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {(sale.items ?? []).map(item => (
            <div key={item.id} style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '15px' }}>{item.product?.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Pedido: {item.quantity_requested ?? item.quantity}kg × {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '14px' }}>
                  {formatCurrency(item.unit_price * (qtys[item.id] ?? 0))}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Entregado:</label>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '36px', padding: 0, flexShrink: 0 }}
                  onClick={() => setQtys(prev => ({
                    ...prev,
                    [item.id]: Math.max(0.1, Math.round(((prev[item.id] ?? 0) - 0.1) * 10) / 10),
                  }))}
                >−</button>
                <input
                  type="number"
                  className="form-input"
                  min={0.1}
                  step={0.1}
                  value={qtys[item.id] ?? 0}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    setQtys(prev => ({ ...prev, [item.id]: isNaN(v) ? 0 : v }))
                  }}
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: '16px', flex: 1 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '36px', padding: 0, flexShrink: 0 }}
                  onClick={() => setQtys(prev => ({
                    ...prev,
                    [item.id]: Math.round(((prev[item.id] ?? 0) + 0.1) * 10) / 10,
                  }))}
                >+</button>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>kg</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', marginBottom: '16px' }}>
          <span style={{ fontWeight: 700 }}>Total a cobrar</span>
          <span style={{ fontWeight: 700, fontSize: '22px', color: 'var(--accent-color)' }}>{formatCurrency(total)}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-success" style={{ flex: 2, fontSize: '15px' }} onClick={confirm} disabled={loading}>
            {loading ? 'Guardando...' : '✓ Confirmar entrega'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Client payment dialog ─────────────────────────────────────────────────────
interface ClientPayDialogProps {
  sale: Sale
  onClose: () => void
  onUpdated: (sale: Sale) => void
}

function ClientPayDialog({ sale, onClose, onUpdated }: ClientPayDialogProps) {
  async function markPaid(method: 'efectivo' | 'transferencia') {
    onClose()
    try {
      const res = await fetch(`/api/sales/${sale.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pagado', payment_method: method }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const updated: Sale = await res.json()
      onUpdated(updated)
      toast.success(`Cobrado en ${method}`, {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              const res2 = await fetch(`/api/sales/${sale.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_status: 'pendiente' }),
              })
              if (!res2.ok) throw new Error()
              onUpdated(await res2.json())
              toast.info('Cobro revertido')
            } catch { toast.error('No se pudo deshacer') }
          },
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar cobro')
    }
  }

  async function revertPayment() {
    const prevMethod = sale.payment_method
    onClose()
    try {
      const res = await fetch(`/api/sales/${sale.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pendiente' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const updated: Sale = await res.json()
      onUpdated(updated)
      toast.success('Cobro revertido', {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              const res2 = await fetch(`/api/sales/${sale.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_status: 'pagado', payment_method: prevMethod }),
              })
              if (!res2.ok) throw new Error()
              onUpdated(await res2.json())
              toast.info('Cobro restaurado')
            } catch { toast.error('No se pudo deshacer') }
          },
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al revertir cobro')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '360px' }}>
        <div className="modal-header">
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sale.customer?.name} · {formatCurrency(sale.total)}</p>
            <h2 className="modal-title" style={{ marginTop: '2px' }}>Cobro al cliente</h2>
          </div>
          <button className="btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        {sale.payment_status === 'pendiente' ? (
          sale.status !== 'entregado' ? (
            <div style={{ padding: '14px', backgroundColor: 'var(--warning-bg)', borderRadius: '10px', border: '1px solid var(--warning-border)' }}>
              <p style={{ fontSize: '14px', color: 'var(--warning)', fontWeight: 600, marginBottom: '4px' }}>No se puede cobrar aún</p>
              <p style={{ fontSize: '13px', color: 'var(--warning)' }}>Primero hay que entregar el pedido con los kilos reales confirmados.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" style={{ width: '100%', minHeight: '56px', fontSize: '15px' }} onClick={() => markPaid('efectivo')}>
                💵 Cobrado en efectivo
              </button>
              <button className="btn btn-primary" style={{ width: '100%', minHeight: '56px', fontSize: '15px' }} onClick={() => markPaid('transferencia')}>
                📱 Cobrado por transferencia
              </button>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--success-bg)', borderRadius: '8px', border: '1px solid var(--success-border)' }}>
              <p style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                Cobrado en {sale.payment_method ?? '—'}
                {sale.paid_at && ` · ${new Date(sale.paid_at).toLocaleDateString('es-AR')}`}
              </p>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', color: 'var(--warning)', borderColor: 'var(--warning-border)' }} onClick={revertPayment}>
              ↩ Revertir cobro
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Supplier payment dialog ───────────────────────────────────────────────────
interface SupplierPayDialogProps {
  sale: Sale
  onClose: () => void
  onUpdated: (sale: Sale) => void
}

function SupplierPayDialog({ sale, onClose, onUpdated }: SupplierPayDialogProps) {
  async function patch(body: Record<string, unknown>): Promise<Sale> {
    const res = await fetch(`/api/sales/${sale.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
    return res.json()
  }

  async function markPaid() {
    onClose()
    try {
      const updated = await patch({ supplier_payment_status: 'pagado' })
      onUpdated(updated)
      toast.success('Pago a Abuelo Julio registrado', {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              onUpdated(await patch({ supplier_payment_status: 'por_pagar' }))
              toast.info('Pago revertido')
            } catch { toast.error('No se pudo deshacer') }
          },
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar pago')
    }
  }

  async function revertPayment() {
    onClose()
    try {
      const updated = await patch({ supplier_payment_status: 'por_pagar' })
      onUpdated(updated)
      toast.success('Pago revertido', {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              onUpdated(await patch({ supplier_payment_status: 'pagado' }))
              toast.info('Pago restaurado')
            } catch { toast.error('No se pudo deshacer') }
          },
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al revertir pago')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '360px' }}>
        <div className="modal-header">
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sale.customer?.name} · {padNum(sale.sale_number)}</p>
            <h2 className="modal-title" style={{ marginTop: '2px' }}>Pago a Abuelo Julio</h2>
          </div>
          <button className="btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        {sale.supplier_payment_status === 'por_pagar' ? (
          <button className="btn btn-primary" style={{ width: '100%', minHeight: '56px', fontSize: '15px' }} onClick={markPaid}>
            ✓ Marcar pagado a Abuelo Julio
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--success-bg)', borderRadius: '8px', border: '1px solid var(--success-border)' }}>
              <p style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                Pagado a Abuelo Julio
                {sale.supplier_paid_at && ` · ${new Date(sale.supplier_paid_at).toLocaleDateString('es-AR')}`}
              </p>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', color: 'var(--warning)', borderColor: 'var(--warning-border)' }} onClick={revertPayment}>
              ↩ Revertir pago
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Delete confirmation dialog ────────────────────────────────────────────────
interface DeleteConfirmDialogProps {
  sale: Sale
  onClose: () => void
  onDeleted: (id: string) => void
}

function DeleteConfirmDialog({ sale, onClose, onDeleted }: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  async function confirmDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      onDeleted(sale.id)
      toast.success(`Venta ${padNum(sale.sale_number)} eliminada`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '360px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Eliminar venta {padNum(sale.sale_number)}</h2>
          <button className="btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Esta acción no se puede deshacer. ¿Confirmás?
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmDelete} disabled={loading}>
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main table component ──────────────────────────────────────────────────────
export function SalesTable({ sales: initialSales, customers, products, isAdmin }: SalesTableProps) {
  const [sales, setSales] = useState(initialSales)
  const [filter, setFilter] = useState<Filter>('todas')
  const [newSaleOpen, setNewSaleOpen] = useState(false)
  const [detailSale, setDetailSale] = useState<Sale | null>(null)
  const [statusDialogSale, setStatusDialogSale] = useState<Sale | null>(null)
  const [confirmDeliverySale, setConfirmDeliverySale] = useState<Sale | null>(null)
  const [clientPaySale, setClientPaySale] = useState<Sale | null>(null)
  const [supplierPaySale, setSupplierPaySale] = useState<Sale | null>(null)
  const [deleteConfirmSale, setDeleteConfirmSale] = useState<Sale | null>(null)

  function updateSale(updated: Sale) {
    setSales(prev => prev.map(s => s.id === updated.id ? updated : s))
    if (detailSale?.id === updated.id) setDetailSale(updated)
  }

  // ── Filter groups ──
  const active = sales.filter(s => s.status !== 'cancelado')
  const porPedir = active.filter(s => s.status === 'pedir')
  const porEncargado = active.filter(s => s.status === 'encargado')
  const enStock = active.filter(s => s.status === 'almacenado')
  const porCobrar = active.filter(s => s.status === 'entregado' && s.payment_status === 'pendiente')
  const porPagarAJ = active.filter(s =>
    s.status === 'entregado' && s.payment_status === 'pagado' && s.supplier_payment_status === 'por_pagar'
  )
  const cerradas = active.filter(s => isClosed(s))
  const hoy = sales.filter(s => isToday(s.created_at) && s.status !== 'cancelado')

  const filtered =
    filter === 'pedir' ? porPedir
      : filter === 'encargado' ? porEncargado
      : filter === 'almacenado' ? enStock
      : filter === 'por-cobrar' ? porCobrar
      : filter === 'por-pagar-aj' ? porPagarAJ
      : filter === 'cerradas' ? cerradas
      : filter === 'hoy' ? hoy
      : sales

  // ── Stats (reactive to sales state) ──
  const totalPorCobrar = porCobrar.reduce((sum, s) => sum + s.total, 0)
  const totalPorPagarAJ = porPagarAJ.reduce((sum, s) =>
    sum + (s.items ?? []).reduce((iSum, i) => iSum + i.quantity * (i.product?.cost ?? 0), 0), 0)
  const almacenadoCount = enStock.length

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: 'todas', label: 'Todas', count: sales.length },
    { key: 'hoy', label: 'Hoy', count: hoy.length },
    { key: 'pedir', label: 'Por pedir', count: porPedir.length },
    { key: 'encargado', label: 'Encargado', count: porEncargado.length },
    { key: 'almacenado', label: 'En stock', count: enStock.length },
    { key: 'por-cobrar', label: 'Por cobrar', count: porCobrar.length },
    { key: 'por-pagar-aj', label: 'Por pagar', count: porPagarAJ.length },
    { key: 'cerradas', label: 'Cerradas', count: cerradas.length },
  ]

  return (
    <>
      {/* Desktop: Nueva venta — top right, before stats */}
      <div className="hide-mobile" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setNewSaleOpen(true)}>
          <Plus size={16} /> Nueva venta
        </button>
      </div>

      {/* Stats row 1: finance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Por cobrar</p>
          {totalPorCobrar > 0 ? (
            <>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--warning)', lineHeight: 1 }}>{formatCurrency(totalPorCobrar)}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{porCobrar.length} {porCobrar.length === 1 ? 'venta' : 'ventas'}</p>
            </>
          ) : (
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)', marginTop: '4px' }}>Todo cobrado</p>
          )}
        </div>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Por pagar a A.J.</p>
          {totalPorPagarAJ > 0 ? (
            <>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--warning)', lineHeight: 1 }}>{formatCurrency(totalPorPagarAJ)}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{porPagarAJ.length} {porPagarAJ.length === 1 ? 'venta' : 'ventas'}</p>
            </>
          ) : (
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)', marginTop: '4px' }}>Sin deudas</p>
          )}
        </div>
      </div>

      {/* Stats row 2: pipeline */}
      <div className="stat-card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Estado de pedidos</p>
        {porPedir.length === 0 && porEncargado.length === 0 && almacenadoCount === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No hay pedidos pendientes de gestionar</p>
        ) : (
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <p style={{ fontSize: '22px', fontWeight: 700, color: porPedir.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1 }}>{porPedir.length}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Por pedir</p>
            </div>
            <div>
              <p style={{ fontSize: '22px', fontWeight: 700, color: porEncargado.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1 }}>{porEncargado.length}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Encargado</p>
            </div>
            <div>
              <p style={{ fontSize: '22px', fontWeight: 700, color: almacenadoCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1 }}>{almacenadoCount}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>En stock</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters — horizontal scroll row */}
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
        msOverflowStyle: 'none',
      } as React.CSSProperties}>
        {FILTERS.map(f => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
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
                transition: 'all 0.15s ease',
              }}
            >
              {f.label} ({f.count})
            </button>
          )
        })}
      </div>

      {/* Mobile cards */}
      <div className="view-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            No hay ventas en este filtro
          </div>
        )}
        {filtered.map(sale => (
          <div
            key={sale.id}
            className="sale-card"
            onClick={() => setDetailSale(sale)}
            style={sale.seller?.color ? { borderLeft: `3px solid ${sale.seller.color}`, overflow: 'hidden' } : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{padNum(sale.sale_number)}</span>
                {isClosed(sale) && <span title="Venta cerrada"><CheckCircle2 size={14} color="var(--success)" /></span>}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDateShort(sale.created_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customer?.name}</span>
                {sale.customer?.address && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {sale.customer.address.length > 50 ? sale.customer.address.slice(0, 47) + '...' : sale.customer.address}
                  </p>
                )}
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-color)', flexShrink: 0, marginLeft: '8px' }}>{formatCurrency(sale.total)}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', marginTop: '6px' }}>{summarizeItems(sale.items)}</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
              <StatusBadge status={sale.status} onClick={e => { e.stopPropagation(); setStatusDialogSale(sale) }} />
              <ClientPayBadge sale={sale} onClick={e => { e.stopPropagation(); setClientPaySale(sale) }} />
              <SupplierPayBadge sale={sale} onClick={e => { e.stopPropagation(); setSupplierPaySale(sale) }} />
            </div>
            {sale.seller?.color && sale.seller?.display_name && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', marginTop: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: sale.seller.color, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sale.seller.display_name}</span>
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
              <th style={{ paddingLeft: '10px', paddingRight: '8px' }}>#</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px' }}>Cliente</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px' }}>Dirección</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px' }}>Items</th>
              <th style={{ textAlign: 'right', paddingLeft: '8px', paddingRight: '8px' }}>Total</th>
              <th style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px' }}>Estado</th>
              <th style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px' }}>Cobro</th>
              <th style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px' }}>Pago</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px' }}>Vendedor</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px' }}>Fecha</th>
              <th style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px' }}>Ver</th>
              <th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                  No hay ventas en este filtro
                </td>
              </tr>
            )}
            {filtered.map(sale => (
              <tr key={sale.id} style={{ cursor: 'pointer' }} onClick={() => setDetailSale(sale)}>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px', paddingLeft: '10px', paddingRight: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {padNum(sale.sale_number)}
                    {isClosed(sale) && <span title="Venta cerrada"><CheckCircle2 size={13} color="var(--success)" /></span>}
                  </div>
                </td>
                <td style={{ fontWeight: 500, paddingLeft: '8px', paddingRight: '8px', whiteSpace: 'nowrap' }}>{sale.customer?.name}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '8px', paddingRight: '8px', maxWidth: '140px' }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sale.customer?.address ?? '—'}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '160px', paddingLeft: '8px', paddingRight: '8px' }}>{summarizeItems(sale.items)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-color)', paddingLeft: '8px', paddingRight: '8px', whiteSpace: 'nowrap' }}>{formatCurrency(sale.total)}</td>
                <td style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px' }} onClick={e => { e.stopPropagation(); setStatusDialogSale(sale) }}>
                  <StatusBadge status={sale.status} />
                </td>
                <td style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px' }} onClick={e => { e.stopPropagation(); setClientPaySale(sale) }}>
                  <ClientPayBadge sale={sale} />
                </td>
                <td style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px' }} onClick={e => { e.stopPropagation(); setSupplierPaySale(sale) }}>
                  <SupplierPayBadge sale={sale} />
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '8px', paddingRight: '8px', whiteSpace: 'nowrap' }}>
                  {sale.seller?.display_name ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {sale.seller.color && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sale.seller.color, flexShrink: 0 }} />
                      )}
                      {sale.seller.display_name}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '8px', paddingRight: '8px', whiteSpace: 'nowrap' }}>{formatDateShort(sale.created_at)}</td>
                <td style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                  <button className="btn btn-icon btn-sm" onClick={e => { e.stopPropagation(); setDetailSale(sale) }}>
                    <Eye size={14} />
                  </button>
                </td>
                <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '10px' }} onClick={e => e.stopPropagation()}>
                  {isAdmin && (
                    <button
                      className="btn btn-icon btn-sm"
                      title={sale.status !== 'cancelado' ? 'Solo se pueden eliminar ventas canceladas' : 'Eliminar venta'}
                      disabled={sale.status !== 'cancelado'}
                      onClick={e => { e.stopPropagation(); if (sale.status === 'cancelado') setDeleteConfirmSale(sale) }}
                      style={{ opacity: sale.status !== 'cancelado' ? 0.25 : 1, color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAB mobile */}
      <button className="fab" onClick={() => setNewSaleOpen(true)}>
        <Plus size={24} />
      </button>

      {/* Dialogs */}
      {newSaleOpen && (
        <NewSaleDialog
          customers={customers}
          products={products}
          onClose={() => setNewSaleOpen(false)}
          onCreated={sale => setSales(prev => [sale, ...prev])}
        />
      )}

      {detailSale && (
        <SaleDetailDialog
          sale={detailSale}
          isAdmin={isAdmin}
          onClose={() => setDetailSale(null)}
          onUpdated={updated => { updateSale(updated); setDetailSale(updated) }}
          onDeleted={id => { setSales(prev => prev.filter(s => s.id !== id)); setDetailSale(null) }}
        />
      )}

      {statusDialogSale && (
        <StatusDialog
          sale={statusDialogSale}
          onClose={() => setStatusDialogSale(null)}
          onStatusChange={updated => { updateSale(updated); setStatusDialogSale(null) }}
          onNeedDeliveryConfirm={() => {
            setConfirmDeliverySale(statusDialogSale)
            setStatusDialogSale(null)
          }}
        />
      )}

      {confirmDeliverySale && (
        <ConfirmDeliveryDialog
          sale={confirmDeliverySale}
          onClose={() => setConfirmDeliverySale(null)}
          onDelivered={updated => { updateSale(updated); setConfirmDeliverySale(null) }}
        />
      )}

      {clientPaySale && (
        <ClientPayDialog
          sale={clientPaySale}
          onClose={() => setClientPaySale(null)}
          onUpdated={updated => { updateSale(updated); setClientPaySale(null) }}
        />
      )}

      {supplierPaySale && (
        <SupplierPayDialog
          sale={supplierPaySale}
          onClose={() => setSupplierPaySale(null)}
          onUpdated={updated => { updateSale(updated); setSupplierPaySale(null) }}
        />
      )}

      {deleteConfirmSale && (
        <DeleteConfirmDialog
          sale={deleteConfirmSale}
          onClose={() => setDeleteConfirmSale(null)}
          onDeleted={id => {
            setSales(prev => prev.filter(s => s.id !== id))
            setDeleteConfirmSale(null)
          }}
        />
      )}
    </>
  )
}
