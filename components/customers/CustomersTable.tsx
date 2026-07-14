'use client'

import { useState } from 'react'
import { Pencil, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Customer } from '@/lib/types'
import { formatPhone } from '@/lib/utils'
import { CustomerDialog } from './CustomerDialog'

interface CustomersTableProps {
  customers: Customer[]
}

const TYPE_STYLES: Record<Customer['customer_type'], React.CSSProperties> = {
  minorista: {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 500,
  },
  mayorista: {
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--accent-color)',
    border: '1px solid var(--accent-color)',
    borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 500,
  },
  restaurante: {
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success)',
    border: '1px solid var(--success-border)',
    borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 500,
  },
}

const TYPE_LABELS: Record<Customer['customer_type'], string> = {
  minorista: 'Minorista',
  mayorista: 'Mayorista',
  restaurante: 'Restaurante',
}

function padNum(n: number) {
  return `#${String(n).padStart(3, '0')}`
}

export function CustomersTable({ customers: initialCustomers }: CustomersTableProps) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      String(c.customer_number).includes(q)
    )
  })

  const active = customers.filter(c => c.is_active).length
  const inactive = customers.length - active

  async function handleToggle(customer: Customer) {
    setToggling(customer.id)
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !customer.is_active }),
      })
      if (!res.ok) throw new Error()
      const updated: Customer = await res.json()
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast.success(updated.is_active ? 'Cliente activado' : 'Cliente desactivado')
    } catch {
      toast.error('Error al actualizar el cliente')
    } finally {
      setToggling(null)
    }
  }

  function handleSaved(customer: Customer) {
    setCustomers(prev => {
      const exists = prev.find(c => c.id === customer.id)
      if (exists) return prev.map(c => c.id === customer.id ? customer : c)
      return [...prev, customer].sort((a, b) => a.customer_number - b.customer_number)
    })
  }

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Buscar por nombre, teléfono o #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '160px' }}
          />
          <button
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0 }}
            onClick={() => { setEditing(null); setDialogOpen(true) }}
          >
            Nuevo cliente
          </button>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {active} activos · {inactive} inactivos · {customers.length} total
        </span>
      </div>

      <div className="data-table">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '64px' }}>#</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Barrio</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                  No se encontraron clientes
                </td>
              </tr>
            )}
            {filtered.map(customer => (
              <tr key={customer.id} style={{ opacity: customer.is_active ? 1 : 0.5 }}>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>
                  {padNum(customer.customer_number)}
                </td>
                <td style={{ fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {customer.name}
                    {customer.needs_review && (
                      <span title={customer.review_reason ?? 'Datos incompletos'} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
                      </span>
                    )}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  {formatPhone(customer.phone) || '—'}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  {customer.neighborhood ?? '—'}
                </td>
                <td>
                  <span style={TYPE_STYLES[customer.customer_type]}>
                    {TYPE_LABELS[customer.customer_type]}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge-status ${customer.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {customer.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      className="btn btn-icon btn-sm"
                      title="Editar"
                      onClick={() => { setEditing(customer); setDialogOpen(true) }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleToggle(customer)}
                      disabled={toggling === customer.id}
                      style={{ fontSize: '12px' }}
                    >
                      {customer.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <CustomerDialog
          customer={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
