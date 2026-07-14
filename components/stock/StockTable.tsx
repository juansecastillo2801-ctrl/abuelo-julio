'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { Inventory } from '@/lib/types'
import { formatDateShort, formatWeight } from '@/lib/utils'
import { AdjustStockDialog } from './AdjustStockDialog'

interface Props {
  inventory: Inventory[]
  role: 'admin' | 'vendedor'
  onSuccess: () => void
}

function StockValue({ stock }: { stock: number }) {
  if (stock > 0) {
    return (
      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px' }}>
        {formatWeight(stock)}
      </span>
    )
  }
  if (stock === 0) {
    return (
      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
        Sin stock
      </span>
    )
  }
  return (
    <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '18px' }}>
      {formatWeight(stock)} ⚠
    </span>
  )
}

function StockValueSmall({ stock }: { stock: number }) {
  if (stock > 0) {
    return (
      <span style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: '22px', lineHeight: 1 }}>
        {formatWeight(stock)}
      </span>
    )
  }
  if (stock === 0) {
    return (
      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
        Sin stock
      </span>
    )
  }
  return (
    <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '20px', lineHeight: 1 }}>
      {formatWeight(stock)} ⚠
    </span>
  )
}

export function StockTable({ inventory, role, onSuccess }: Props) {
  const [search, setSearch] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<Inventory | null>(null)

  const filtered = inventory.filter(inv =>
    (inv.product?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: '36px',
            paddingRight: '12px',
            paddingTop: '10px',
            paddingBottom: '10px',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            fontSize: '14px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          {search ? 'Sin resultados para esa búsqueda' : 'No hay productos en inventario'}
        </div>
      )}

      {/* Mobile cards */}
      <div className="view-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(inv => (
          <div
            key={inv.id}
            className="stat-card"
            style={{ padding: '14px 16px', cursor: role === 'admin' ? 'pointer' : 'default' }}
            onClick={() => { if (role === 'admin') setAdjustTarget(inv) }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {inv.product?.name ?? '—'}
                </p>
                <StockValueSmall stock={inv.current_stock} />
                {inv.last_restock_at && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Última entrada: {formatDateShort(inv.last_restock_at)}
                  </p>
                )}
              </div>
              {role === 'admin' && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px', flexShrink: 0 }}>
                  Ajustar →
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="data-table view-desktop" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: '16px', paddingRight: '8px', textAlign: 'left' }}>Producto</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'right' }}>Stock disponible</th>
              <th style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'left' }}>Última entrada</th>
              {role === 'admin' && (
                <th style={{ paddingLeft: '8px', paddingRight: '16px', textAlign: 'center', width: '80px' }}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id}>
                <td style={{ fontWeight: 500, paddingLeft: '16px', paddingRight: '8px' }}>
                  {inv.product?.name ?? '—'}
                </td>
                <td style={{ textAlign: 'right', paddingLeft: '8px', paddingRight: '8px' }}>
                  <StockValue stock={inv.current_stock} />
                </td>
                <td style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '8px', paddingRight: '8px' }}>
                  {inv.last_restock_at ? formatDateShort(inv.last_restock_at) : '—'}
                </td>
                {role === 'admin' && (
                  <td style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '16px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '4px 12px', minHeight: 'unset' }}
                      onClick={() => setAdjustTarget(inv)}
                    >
                      Ajustar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={role === 'admin' ? 4 : 3}
                  style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}
                >
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adjustTarget && (
        <AdjustStockDialog
          inventory={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSuccess={() => { setAdjustTarget(null); onSuccess() }}
        />
      )}
    </>
  )
}
