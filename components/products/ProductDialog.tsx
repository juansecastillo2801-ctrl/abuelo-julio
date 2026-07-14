'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'

interface ProductDialogProps {
  product: Product | null
  onClose: () => void
  onSaved: (product: Product) => void
}

function marginColor(margin: number): string {
  if (margin >= 20) return 'var(--success)'
  if (margin >= 10) return 'var(--warning)'
  return 'var(--danger)'
}

export function ProductDialog({ product, onClose, onSaved }: ProductDialogProps) {
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product?.price?.toString() ?? '')
  const [cost, setCost] = useState(product?.cost?.toString() ?? '')
  const [loading, setLoading] = useState(false)

  const priceNum = parseFloat(price)
  const costNum = parseFloat(cost)
  const showMargin = !isNaN(priceNum) && !isNaN(costNum) && costNum > 0
  const margin = showMargin ? Math.round(((priceNum - costNum) / costNum) * 100) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body: Record<string, unknown> = {
      name,
      price: parseFloat(price),
      unit: 'kg',
    }
    if (cost) body.cost = parseFloat(cost)

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error desconocido')
      }
      const saved: Product = await res.json()
      toast.success(product ? 'Producto actualizado' : 'Producto creado')
      onSaved(saved)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Nombre *</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Ej: Bife de chorizo"
            />
          </div>

          <div>
            <label className="form-label">Precio venta/kg *</label>
            <input
              className="form-input"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="form-label">Costo/kg</label>
            <input
              className="form-input"
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {margin !== null && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', fontSize: '13px' }}>
              Margen estimado:{' '}
              <strong style={{ color: marginColor(margin) }}>{margin}%</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
