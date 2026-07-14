'use client'

import { useState } from 'react'
import { X, Search, ChevronLeft, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Customer, Product, Sale } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { CustomerDialog } from '@/components/customers/CustomerDialog'

interface NewSaleDialogProps {
  customers: Customer[]
  products: Product[]
  onClose: () => void
  onCreated: (sale: Sale) => void
}

export function NewSaleDialog({ customers, products, onClose, onCreated }: NewSaleDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [localCustomers, setLocalCustomers] = useState(customers)
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [prefilledName, setPrefilledName] = useState('')

  const filteredCustomers = localCustomers.filter(c =>
    c.is_active && (
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone ?? '').includes(customerSearch) ||
      c.address.toLowerCase().includes(customerSearch.toLowerCase())
    )
  )

  const hasSearch = customerSearch.trim().length > 0
  const noResults = hasSearch && filteredCustomers.length === 0

  const filteredProducts = products.filter(p =>
    p.is_active && p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  // Derived cart state
  const cartItems = products
    .filter(p => (quantities[p.id] ?? 0) > 0)
    .map(p => ({ product: p, quantity: quantities[p.id]! }))
  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const cartKg = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setQuantities({})
    setStep(2)
  }

  function handleNewCustomerSaved(newCustomer: Customer) {
    setLocalCustomers(prev => [newCustomer, ...prev])
    setSelectedCustomer(newCustomer)
    setQuantities({})
    setNewCustomerOpen(false)
    setStep(2)
    toast.success(`Cliente ${newCustomer.name} creado y seleccionado`)
  }

  function openNewCustomer(name = '') {
    setPrefilledName(name)
    setNewCustomerOpen(true)
  }

  function increment(productId: string) {
    setQuantities(prev => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }))
  }

  function decrement(productId: string) {
    setQuantities(prev => {
      const current = prev[productId] ?? 0
      if (current <= 1) {
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return { ...prev, [productId]: current - 1 }
    })
  }

  function commitEdit() {
    if (!editingId) return
    const v = parseInt(editingValue, 10)
    const qty = isNaN(v) || v <= 0 ? 0 : v
    setQuantities(prev => {
      if (qty === 0) {
        const next = { ...prev }
        delete next[editingId]
        return next
      }
      return { ...prev, [editingId]: qty }
    })
    setEditingId(null)
    setEditingValue('')
  }

  function goBack() {
    setStep(s => (s - 1) as 1 | 2 | 3)
  }

  async function handleConfirm() {
    if (!selectedCustomer || cartItems.length === 0) return
    setLoading(true)

    const body = {
      customer_id: selectedCustomer.id,
      status: 'pedir',
      payment_status: 'pendiente',
      supplier_payment_status: 'por_pagar',
      notes: notes || null,
      items: cartItems.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity,
        quantity_requested: i.quantity,
        unit_price: i.product.price,
      })),
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al crear la venta')
      }
      const sale: Sale = await res.json()
      toast.success('Venta registrada')
      onCreated(sale)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="modal-overlay modal-fullscreen-mobile" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div
          className={`modal-box${step === 2 ? ' step-2' : ''}`}
          style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column' }}
        >

          {/* Header */}
          <div
            className="modal-header"
            style={step === 2 ? { padding: '20px 24px 16px', marginBottom: 0 } : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {step > 1 && (
                <button className="btn btn-icon btn-sm" onClick={goBack}>
                  <ChevronLeft size={18} />
                </button>
              )}
              <div>
                <h2 className="modal-title">
                  {step === 1 ? 'Seleccionar cliente' : step === 2 ? 'Agregar productos' : 'Confirmar pedido'}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Paso {step} de 3</p>
              </div>
            </div>
            <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
          </div>

          {/* ── PASO 1: Cliente ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Buscar por nombre, dirección o teléfono..."
                  style={{ paddingLeft: '38px' }}
                  autoFocus
                />
              </div>

              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* No results → contextual "Crear X" card */}
                {noResults ? (
                  <button
                    className="new-customer-card"
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => openNewCustomer(customerSearch.trim())}
                  >
                    <div className="new-customer-card-icon">
                      <Plus size={20} />
                    </div>
                    <div className="new-customer-card-text">
                      <p className="new-customer-card-title">Crear "{customerSearch.trim()}"</p>
                      <p className="new-customer-card-subtitle">como nuevo cliente</p>
                    </div>
                  </button>
                ) : (
                  <>
                    {/* Fixed "Nuevo cliente" card at the top */}
                    <button
                      className="new-customer-card"
                      style={{ width: '100%', textAlign: 'left' }}
                      onClick={() => openNewCustomer('')}
                    >
                      <div className="new-customer-card-icon">
                        <Plus size={20} />
                      </div>
                      <div className="new-customer-card-text">
                        <p className="new-customer-card-title">Nuevo cliente</p>
                        <p className="new-customer-card-subtitle">Crear un cliente nuevo</p>
                      </div>
                    </button>

                    {/* Existing customers */}
                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{c.name}</p>
                        {c.address && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.address}</p>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── PASO 2: Productos ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

              {/* Customer bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 24px',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                flexShrink: 0,
              }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>{selectedCustomer?.name}</p>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => setStep(1)} style={{ fontSize: '12px' }}>Cambiar</button>
              </div>

              {/* Search */}
              <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    className="form-input"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              {/* Product list — scrollable, fills remaining height */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {filteredProducts.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No se encontraron productos</p>
                )}
                {filteredProducts.map(p => {
                  const qty = quantities[p.id] ?? 0
                  const hasQty = qty > 0
                  return (
                    <div key={p.id} className={`product-list-item${hasQty ? ' has-quantity' : ''}`}>
                      <div className="product-info">
                        <p className="product-name">{p.name}</p>
                        <p className="product-price">{formatCurrency(p.price)}/kg</p>
                      </div>
                      <div className="qty-counter">
                        <button type="button" onClick={() => decrement(p.id)} disabled={qty === 0}>−</button>
                        {editingId === p.id ? (
                          <input
                            type="number"
                            autoFocus
                            min={0}
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            style={{
                              width: '44px',
                              textAlign: 'center',
                              fontSize: '15px',
                              fontWeight: 600,
                              border: '1px solid var(--accent-color)',
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--text-primary)',
                              padding: '4px 2px',
                            }}
                          />
                        ) : (
                          <span
                            className={`qty-value${hasQty ? ' active' : ''}`}
                            onClick={() => { setEditingId(p.id); setEditingValue(qty > 0 ? String(qty) : '') }}
                          >
                            {qty}
                          </span>
                        )}
                        <button type="button" onClick={() => increment(p.id)}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Cart bar — sticky at bottom */}
              <div className="cart-bar">
                <div className="cart-summary">
                  <span className="cart-summary-line">
                    {cartItems.length === 0
                      ? 'Sin productos seleccionados'
                      : `${cartItems.length} producto${cartItems.length !== 1 ? 's' : ''} · ${cartKg}kg`}
                  </span>
                  {cartItems.length > 0 && (
                    <span className="cart-summary-total">{formatCurrency(cartTotal)}</span>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  style={{ minHeight: '44px', padding: '0 24px', fontSize: '15px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => setStep(3)}
                  disabled={cartItems.length === 0}
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: Confirmar ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Resumen del pedido</p>
                <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>{selectedCustomer?.name}</p>
                {cartItems.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>{item.quantity}kg {item.product.name}</span>
                    <span>{formatCurrency(item.product.price * item.quantity)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Total estimado</span>
                  <span style={{ color: 'var(--accent-color)', fontSize: '20px' }}>{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  El pedido se registra como <strong style={{ color: 'var(--text-primary)' }}>Por pedir a Abuelo Julio</strong>. El cobro y pago al proveedor se gestionan después desde el listado.
                </p>
              </div>

              <div>
                <label className="form-label">Notas (opcional)</label>
                <textarea
                  className="form-input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Instrucciones especiales, aclaraciones..."
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={goBack} style={{ flex: 1 }}>← Atrás</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Registrar pedido'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer creation dialog — rendered outside the main overlay to avoid z-index stacking */}
      {newCustomerOpen && (
        <CustomerDialog
          customer={null}
          prefilledName={prefilledName}
          onClose={() => setNewCustomerOpen(false)}
          onSaved={handleNewCustomerSaved}
        />
      )}
    </>
  )
}
