'use client'

import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import type { Sale } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface SaleDetailDialogProps {
  sale: Sale
  isAdmin: boolean
  onClose: () => void
  onUpdated: (sale: Sale) => void
  onDeleted?: (id: string) => void
}

function padNum(n: number) {
  return `#${String(n).padStart(3, '0')}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_LABELS: Record<string, string> = {
  pedir: 'Por pedir', encargado: 'Encargado', almacenado: 'En stock', entregado: 'Entregado',
}

export function SaleDetailDialog({ sale: initialSale, isAdmin, onClose, onUpdated, onDeleted }: SaleDetailDialogProps) {
  const [sale, setSale] = useState(initialSale)
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>(
    sale.payment_method ?? 'efectivo'
  )

  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false)
  const [deliveryQtys, setDeliveryQtys] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const item of initialSale.items ?? []) {
      map[item.id] = item.quantity_requested ?? item.quantity ?? 0
    }
    return map
  })

  const [confirmRevertDelivery, setConfirmRevertDelivery] = useState(false)
  const [confirmRevertPayment, setConfirmRevertPayment] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmReactivate, setConfirmReactivate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const deliveryTotal = (sale.items ?? []).reduce((sum, item) => {
    return sum + item.unit_price * (deliveryQtys[item.id] ?? 0)
  }, 0)

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/sales/${sale.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Error al actualizar')
    }
    return res.json() as Promise<Sale>
  }

  async function handleConfirmDelivery() {
    setLoading('deliver')
    try {
      const items = (sale.items ?? []).map(item => ({
        item_id: item.id,
        quantity: deliveryQtys[item.id] ?? 0,
      }))

      const itemsRes = await fetch(`/api/sales/${sale.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!itemsRes.ok) {
        const data = await itemsRes.json()
        throw new Error(data.error ?? 'Error al actualizar cantidades')
      }

      const updated = await patch({ status: 'entregado' })
      setSale(updated)
      onUpdated(updated)
      setShowDeliveryConfirm(false)
      toast.success('Venta marcada como entregada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  async function handleRevertDelivery() {
    setLoading('revert-deliver')
    try {
      const updated = await patch({ status: 'almacenado' })
      setSale(updated)
      onUpdated(updated)
      setConfirmRevertDelivery(false)
      toast.success('Entrega revertida')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  async function handleMarkPaid() {
    setLoading('pay')
    try {
      const updated = await patch({ payment_status: 'pagado', payment_method: paymentMethod })
      setSale(updated)
      onUpdated(updated)
      toast.success('Pago registrado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  async function handleRevertPayment() {
    setLoading('revert-pay')
    try {
      const updated = await patch({ payment_status: 'pendiente' })
      setSale(updated)
      onUpdated(updated)
      setConfirmRevertPayment(false)
      toast.success('Pago revertido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  async function handleCancel() {
    setLoading('cancel')
    try {
      const updated = await patch({ status: 'cancelado' })
      setSale(updated)
      onUpdated(updated)
      toast.success('Venta cancelada')
      setConfirmCancel(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  async function handleReactivate() {
    setLoading('reactivate')
    try {
      const res = await fetch(`/api/sales/${sale.id}/reactivate`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const updated: Sale = await res.json()
      setSale(updated)
      onUpdated(updated)
      setConfirmReactivate(false)
      toast.success('Venta reactivada', {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              const r = await fetch(`/api/sales/${sale.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelado' }),
              })
              if (!r.ok) throw new Error()
              const reverted: Sale = await r.json()
              setSale(reverted)
              onUpdated(reverted)
              toast.info('Reactivación deshecha')
            } catch { toast.error('No se pudo deshacer') }
          },
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reactivar')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete() {
    setLoading('delete')
    try {
      const res = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      toast.success(`Venta ${padNum(sale.sale_number)} eliminada`)
      onDeleted?.(sale.id)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setLoading(null)
    }
  }

  // ── Delivery confirmation screen ──
  if (showDeliveryConfirm) {
    return (
      <div className="modal-overlay modal-fullscreen-mobile" onClick={e => { if (e.target === e.currentTarget) setShowDeliveryConfirm(false) }}>
        <div className="modal-box" style={{ maxWidth: '480px' }}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title">Confirmar entrega</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {sale.customer?.name} — {padNum(sale.sale_number)}
              </p>
            </div>
            <button className="btn btn-icon btn-sm" onClick={() => setShowDeliveryConfirm(false)}><X size={16} /></button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Ajustá las cantidades reales entregadas si difieren del pedido.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {(sale.items ?? []).map(item => (
              <div key={item.id} style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '15px' }}>{item.product?.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Pedido: {item.quantity_requested}kg × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '14px' }}>
                    {formatCurrency(item.unit_price * (deliveryQtys[item.id] ?? 0))}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Entregado:</label>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '36px', padding: 0, flexShrink: 0 }}
                    onClick={() => setDeliveryQtys(prev => ({
                      ...prev,
                      [item.id]: Math.max(0.1, Math.round(((prev[item.id] ?? 0) - 0.1) * 10) / 10),
                    }))}
                  >−</button>
                  <input
                    type="number"
                    className="form-input"
                    min={0.1}
                    step={0.1}
                    value={deliveryQtys[item.id] ?? 0}
                    onChange={e => {
                      const v = parseFloat(e.target.value)
                      setDeliveryQtys(prev => ({ ...prev, [item.id]: isNaN(v) ? 0 : v }))
                    }}
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: '16px', flex: 1 }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '36px', padding: 0, flexShrink: 0 }}
                    onClick={() => setDeliveryQtys(prev => ({
                      ...prev,
                      [item.id]: Math.round(((prev[item.id] ?? 0) + 0.1) * 10) / 10,
                    }))}
                  >+</button>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>kg</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', marginBottom: '16px' }}>
            <span style={{ fontWeight: 700 }}>Total a cobrar</span>
            <span style={{ fontWeight: 700, fontSize: '22px', color: 'var(--accent-color)' }}>{formatCurrency(deliveryTotal)}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeliveryConfirm(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-success"
              style={{ flex: 2, fontSize: '15px' }}
              onClick={handleConfirmDelivery}
              disabled={loading === 'deliver'}
            >
              {loading === 'deliver' ? 'Guardando...' : '✓ Confirmar entrega'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main detail view ──
  return (
    <div className="modal-overlay modal-fullscreen-mobile" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Venta {padNum(sale.sale_number)}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatDate(sale.created_at)}</p>
            {sale.seller?.display_name && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {sale.seller.color && (
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sale.seller.color, flexShrink: 0 }} />
                )}
                Vendida por {sale.seller.display_name}
              </p>
            )}
          </div>
          <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Cliente + badges */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontWeight: 700, fontSize: '20px', marginBottom: '10px' }}>{sale.customer?.name}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className={`badge-status badge-${sale.status}`}>
              {{ pedir: 'Por pedir', encargado: 'Encargado', almacenado: 'En stock', entregado: 'Entregado', cancelado: 'Cancelado' }[sale.status]}
            </span>
            <span className={`badge-status ${sale.payment_status === 'pagado' ? 'badge-pagado' : 'badge-por-cobrar'}`}>
              {sale.payment_status === 'pagado'
                ? `Cobrado${sale.payment_method ? ` · ${sale.payment_method}` : ''}`
                : 'Por cobrar'}
            </span>
            <span className={`badge-status ${sale.supplier_payment_status === 'pagado' ? 'badge-pagado' : 'badge-por-pagar'}`}>
              {sale.supplier_payment_status === 'pagado' ? 'Pagado a A.J.' : 'A.J. por pagar'}
            </span>
          </div>
          {sale.delivered_at && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Entregado: {formatDate(sale.delivered_at)}
            </p>
          )}
          {sale.paid_at && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Pagado: {formatDate(sale.paid_at)}
            </p>
          )}
        </div>

        {/* Items */}
        <div style={{ marginBottom: '20px' }}>
          {sale.items?.map(item => {
            const delivered = item.quantity
            const requested = item.quantity_requested
            const differs = Math.abs(delivered - requested) > 0.001
            return (
              <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span>{delivered}kg {item.product?.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.unit_price * delivered)}</span>
                </div>
                {differs && (
                  <p style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '2px' }}>
                    Pedido original: {requested}kg
                  </p>
                )}
              </div>
            )
          })}
          {sale.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
              <span>Descuento</span>
              <span>− {formatCurrency(sale.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', fontWeight: 700, fontSize: '20px' }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent-color)' }}>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {/* Notas */}
        {sale.notes && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Notas</p>
            <p style={{ fontSize: '14px' }}>{sale.notes}</p>
          </div>
        )}

        {/* Acciones — venta cancelada */}
        {sale.status === 'cancelado' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Reactivar */}
            {confirmReactivate ? (
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--accent-color)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>¿Reactivar esta venta?</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Va a volver al estado &quot;{STATUS_LABELS[sale.previous_status ?? 'pedir'] ?? sale.previous_status}&quot;.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmReactivate(false)}>Cancelar</button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleReactivate}
                    disabled={loading === 'reactivate'}
                  >
                    {loading === 'reactivate' ? 'Reactivando...' : 'Sí, reactivar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                onClick={() => setConfirmReactivate(true)}
              >
                ↻ Reactivar venta
              </button>
            )}

            {/* Eliminar definitivamente — solo admin */}
            {isAdmin && (confirmDelete ? (
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--danger-border)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Eliminar venta {padNum(sale.sale_number)}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Esta acción no se puede deshacer. ¿Confirmás?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>Cancelar</button>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={handleDelete}
                    disabled={loading === 'delete'}
                  >
                    {loading === 'delete' ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                onClick={() => setConfirmDelete(true)}
              >
                🗑 Eliminar definitivamente
              </button>
            ))}
          </div>
        )}

        {/* Acciones — venta activa */}
        {sale.status !== 'cancelado' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Confirmar entrega (solo desde almacenado) */}
            {sale.status === 'almacenado' && (
              <button
                className="btn btn-success"
                style={{ width: '100%', fontSize: '16px' }}
                onClick={() => setShowDeliveryConfirm(true)}
              >
                ✓ Confirmar entrega al cliente
              </button>
            )}

            {/* Registrar cobro — bloqueado si no está entregado */}
            {sale.payment_status === 'pendiente' && sale.status !== 'entregado' && (
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  El cobro se registra una vez entregado el pedido con los kilos reales confirmados.
                </p>
              </div>
            )}

            {/* Registrar cobro */}
            {sale.status === 'entregado' && sale.payment_status === 'pendiente' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['efectivo', 'transferencia'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: `2px solid ${paymentMethod === m ? 'var(--accent-color)' : 'var(--border-color)'}`,
                        backgroundColor: paymentMethod === m ? 'var(--accent-glow)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                        minHeight: '56px',
                      }}
                    >
                      {m === 'efectivo' ? '💵 Efectivo' : '📱 Transferencia'}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '16px' }}
                  onClick={handleMarkPaid}
                  disabled={loading === 'pay'}
                >
                  {loading === 'pay' ? 'Guardando...' : '$ Marcar pagado'}
                </button>
              </div>
            )}

            {/* Revertir entrega */}
            {sale.status === 'entregado' && (
              confirmRevertDelivery ? (
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--warning-border)' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                    ¿Revertir la entrega? Esto repondrá el stock automáticamente.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmRevertDelivery(false)}>
                      Cancelar
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, color: 'var(--warning)', borderColor: 'var(--warning-border)' }}
                      onClick={handleRevertDelivery}
                      disabled={loading === 'revert-deliver'}
                    >
                      {loading === 'revert-deliver' ? 'Revirtiendo...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', color: 'var(--warning)', borderColor: 'var(--warning-border)' }}
                  onClick={() => setConfirmRevertDelivery(true)}
                >
                  <RotateCcw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Revertir entrega
                </button>
              )
            )}

            {/* Revertir pago */}
            {sale.payment_status === 'pagado' && (
              confirmRevertPayment ? (
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--warning-border)' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                    ¿Revertir el pago? El estado volverá a &quot;Por cobrar&quot;.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmRevertPayment(false)}>
                      Cancelar
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, color: 'var(--warning)', borderColor: 'var(--warning-border)' }}
                      onClick={handleRevertPayment}
                      disabled={loading === 'revert-pay'}
                    >
                      {loading === 'revert-pay' ? 'Revirtiendo...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', color: 'var(--warning)', borderColor: 'var(--warning-border)' }}
                  onClick={() => setConfirmRevertPayment(true)}
                >
                  <RotateCcw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Revertir pago
                </button>
              )
            )}

            {/* Cancelar venta */}
            {sale.status !== 'entregado' && (
              confirmCancel ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmCancel(false)}>
                    No cancelar
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={handleCancel}
                    disabled={loading === 'cancel'}
                  >
                    {loading === 'cancel' ? 'Cancelando...' : 'Confirmar cancelación'}
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancelar venta
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
