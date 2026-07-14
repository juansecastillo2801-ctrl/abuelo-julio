'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { ProductDialog } from './ProductDialog'

interface ProductsTableProps {
  products: Product[]
  isAdmin: boolean
}

function getMarginInfo(price: number, cost: number | null): { pct: number; cls: string } | null {
  if (cost === null || cost === 0) return null
  const pct = Math.round(((price - cost) / cost) * 100)
  const cls = pct >= 20 ? 'margin-green' : pct >= 10 ? 'margin-yellow' : 'margin-red'
  return { pct, cls }
}

function MarginBadge({ price, cost }: { price: number; cost: number | null }) {
  const info = getMarginInfo(price, cost)
  if (!info) return <span style={{ color: 'var(--text-muted)' }}>—</span>

  let bg: string, color: string, border: string
  if (info.pct >= 20) {
    bg = 'var(--success-bg)'; color = 'var(--success)'; border = 'var(--success-border)'
  } else if (info.pct >= 10) {
    bg = 'var(--warning-bg)'; color = 'var(--warning)'; border = 'var(--warning-border)'
  } else {
    bg = 'var(--danger-bg)'; color = 'var(--danger)'; border = 'var(--danger-border)'
  }

  return (
    <span style={{ backgroundColor: bg, color, border: `1px solid ${border}`, borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 500 }}>
      {info.pct}%
    </span>
  )
}

export function ProductsTable({ products: initialProducts, isAdmin }: ProductsTableProps) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const active = products.filter(p => p.is_active).length
  const inactive = products.length - active

  async function handleToggle(product: Product) {
    setToggling(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      })
      if (!res.ok) throw new Error()
      const updated: Product = await res.json()
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
      toast.success(updated.is_active ? 'Producto activado' : 'Producto desactivado')
    } catch {
      toast.error('Error al actualizar el producto')
    } finally {
      setToggling(null)
    }
  }

  function handleSaved(product: Product) {
    setProducts(prev => {
      const exists = prev.find(p => p.id === product.id)
      return exists
        ? prev.map(p => p.id === product.id ? product : p)
        : [product, ...prev]
    })
  }

  function openEdit(product: Product) {
    setEditing(product)
    setDialogOpen(true)
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <input
            className="form-input"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '140px' }}
          />
          {isAdmin && (
            <button
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => { setEditing(null); setDialogOpen(true) }}
            >
              Nuevo producto
            </button>
          )}
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {active} activos · {inactive} inactivos · {products.length} total
        </span>
      </div>

      {/* Desktop table — hidden on mobile, shown on md+ */}
      <div className="view-desktop">
        <div className="data-table">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Corte</th>
              <th style={{ textAlign: 'right' }}>Precio venta/kg</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Costo/kg</th>}
              {isAdmin && <th style={{ textAlign: 'center' }}>Margen</th>}
              <th style={{ textAlign: 'center' }}>Estado</th>
              {isAdmin && <th style={{ textAlign: 'center' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 2}
                  style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}
                >
                  No se encontraron productos
                </td>
              </tr>
            )}
            {filtered.map(product => (
              <tr key={product.id} style={{ opacity: product.is_active ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{product.name}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(product.price)}</td>
                {isAdmin && (
                  <td style={{ textAlign: 'right' }}>
                    {product.cost != null
                      ? formatCurrency(product.cost)
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                )}
                {isAdmin && (
                  <td style={{ textAlign: 'center' }}>
                    <MarginBadge price={product.price} cost={product.cost} />
                  </td>
                )}
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge-status ${product.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {isAdmin && (
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-icon btn-sm"
                        title="Editar"
                        onClick={() => openEdit(product)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleToggle(product)}
                        disabled={toggling === product.id}
                        style={{ fontSize: '12px' }}
                      >
                        {product.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="view-mobile">
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
            No se encontraron productos
          </p>
        ) : (
          filtered.map(product => {
            const info = getMarginInfo(product.price, product.cost)
            const badgeStyle = info === null ? null
              : info.pct >= 20 ? { backgroundColor: 'var(--success-bg)', color: 'var(--success)' }
              : info.pct >= 10 ? { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }
              : { backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }

            return (
              <div
                key={product.id}
                onClick={() => openEdit(product)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  opacity: product.is_active ? 1 : 0.5,
                  marginBottom: '6px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {product.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {!product.is_active && 'Inactivo · '}
                    {product.cost != null ? `Costo ${formatCurrency(product.cost)}` : 'Sin costo'}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', color: 'var(--accent-color)', fontWeight: 500 }}>
                    {formatCurrency(product.price)}
                  </span>
                  {info && badgeStyle && (
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 7px',
                      borderRadius: '10px',
                      fontWeight: 500,
                      ...badgeStyle,
                    }}>
                      {info.pct}%
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {dialogOpen && (
        <ProductDialog
          product={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
