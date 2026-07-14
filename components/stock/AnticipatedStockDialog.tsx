'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'

interface Props {
  products: Product[]
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

export function AnticipatedStockDialog({ products, onClose, onSuccess }: Props) {
  const [search, setSearch] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedProduct = products.find(p => p.id === productId)

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectProduct(p: Product) {
    setProductId(p.id)
    setSearch(p.name)
    setCost(p.cost != null ? String(p.cost) : '')
    setDropdownOpen(false)
  }

  async function submit() {
    const qty = parseFloat(quantity)
    if (!productId) { toast.error('Seleccioná un producto'); return }
    if (isNaN(qty) || qty <= 0) { toast.error('La cantidad debe ser mayor a 0'); return }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        product_id: productId,
        quantity: qty,
        notes: notes.trim() || null,
      }
      const parsedCost = cost ? parseFloat(cost) : null
      if (parsedCost !== null && !isNaN(parsedCost)) body.cost = parsedCost

      const res = await fetch('/api/inventory/anticipated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error')
      }
      toast.success('Stock ingresado correctamente')
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al ingresar stock')
    } finally {
      setLoading(false)
    }
  }

  const costChanged = cost && selectedProduct?.cost != null && parseFloat(cost) !== selectedProduct.cost

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Ingreso anticipado</h2>
          <button className="btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Product search */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label style={LABEL_STYLE}>Producto *</label>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              autoComplete="off"
              onChange={e => {
                setSearch(e.target.value)
                setProductId('')
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              style={INPUT_STYLE}
            />
            {dropdownOpen && search.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden',
                maxHeight: '180px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-card)',
                zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}>
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Sin resultados
                  </div>
                ) : filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onMouseDown={() => selectProduct(p)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      borderBottom: '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {p.name}
                    {p.cost != null && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                        ${p.cost}/kg
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label style={LABEL_STYLE}>Cantidad (kg) *</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="0.0"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>

          {/* Cost */}
          <div>
            <label style={LABEL_STYLE}>
              Costo unitario ($/kg)
              {selectedProduct?.cost != null && (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                  {' '}— actual: ${selectedProduct.cost}
                </span>
              )}
            </label>
            <input
              type="number"
              step="1"
              min="0"
              placeholder={selectedProduct?.cost != null ? String(selectedProduct.cost) : 'Sin costo registrado'}
              value={cost}
              onChange={e => setCost(e.target.value)}
              style={INPUT_STYLE}
            />
            {costChanged && (
              <p style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '5px' }}>
                El costo del producto se actualizará de ${selectedProduct!.cost} a ${cost}/kg
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={LABEL_STYLE}>Notas (opcional)</label>
            <textarea
              placeholder="Proveedor, lote, observaciones..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
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
              disabled={!productId || !quantity || loading}
            >
              {loading ? 'Ingresando...' : 'Confirmar ingreso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
