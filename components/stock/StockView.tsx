'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Inventory, InventoryMovement, Sale, Product } from '@/lib/types'
import { StockTable } from './StockTable'
import { MovementsHistory } from './MovementsHistory'
import { ReceptionDialog } from './ReceptionDialog'
import { AnticipatedStockDialog } from './AnticipatedStockDialog'

type Tab = 'stock' | 'movimientos'

interface Props {
  inventory: Inventory[]
  movements: InventoryMovement[]
  encargadas: Sale[]
  products: Product[]
  role: 'admin' | 'vendedor'
}

export function StockView({ inventory, movements, encargadas, products, role }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('stock')
  const [receptionOpen, setReceptionOpen] = useState(false)
  const [anticipatedOpen, setAnticipatedOpen] = useState(false)

  function refresh() {
    router.refresh()
  }

  return (
    <>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={() => setReceptionOpen(true)}
          style={{ flex: 1, minWidth: '160px', position: 'relative' }}
        >
          Recepción de pedidos
          {encargadas.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: 'var(--danger)',
              color: '#fff',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              minWidth: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
            }}>
              {encargadas.length}
            </span>
          )}
        </button>
        {role === 'admin' && (
          <button
            className="btn btn-secondary"
            onClick={() => setAnticipatedOpen(true)}
            style={{ flex: 1, minWidth: '160px' }}
          >
            Ingreso anticipado
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px',
      }}>
        {(['stock', 'movimientos'] as Tab[]).map(t => {
          const isActive = tab === t
          const label = t === 'stock' ? 'Stock actual' : 'Movimientos'
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--accent-color)' : 'transparent'}`,
                color: isActive ? 'var(--accent-color)' : 'var(--text-muted)',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 0.15s, border-color 0.15s',
                marginBottom: '-1px',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'stock' && (
        <StockTable
          inventory={inventory}
          role={role}
          onSuccess={refresh}
        />
      )}
      {tab === 'movimientos' && (
        <MovementsHistory movements={movements} />
      )}

      {receptionOpen && (
        <ReceptionDialog
          encargadas={encargadas}
          onClose={() => setReceptionOpen(false)}
          onSuccess={() => { setReceptionOpen(false); refresh() }}
        />
      )}
      {anticipatedOpen && role === 'admin' && (
        <AnticipatedStockDialog
          products={products}
          onClose={() => setAnticipatedOpen(false)}
          onSuccess={() => { setAnticipatedOpen(false); refresh() }}
        />
      )}
    </>
  )
}
