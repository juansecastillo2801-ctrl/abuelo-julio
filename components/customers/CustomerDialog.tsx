'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { Customer } from '@/lib/types'
import { formatPhone, cleanPhone } from '@/lib/utils'

interface CustomerDialogProps {
  customer: Customer | null
  onClose: () => void
  onSaved: (customer: Customer) => void
  prefilledName?: string
}

const Req = () => <span style={{ color: 'var(--danger)' }}> *</span>

export function CustomerDialog({ customer, onClose, onSaved, prefilledName }: CustomerDialogProps) {
  const [name, setName] = useState(prefilledName ?? customer?.name ?? '')
  const [address, setAddress] = useState(customer?.address ?? '')
  const [phone, setPhone] = useState(formatPhone(customer?.phone ?? null))
  const [email, setEmail] = useState(customer?.email ?? '')
  const [neighborhood, setNeighborhood] = useState(customer?.neighborhood ?? '')
  const [deliveryNotes, setDeliveryNotes] = useState(customer?.delivery_notes ?? '')
  const [customerType, setCustomerType] = useState<Customer['customer_type']>(
    customer?.customer_type ?? 'minorista'
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body: Record<string, unknown> = {
      name,
      address,
      phone: cleanPhone(phone) || null,
      email: email || null,
      neighborhood: neighborhood || null,
      delivery_notes: deliveryNotes || null,
      customer_type: customerType,
    }

    try {
      const url = customer ? `/api/customers/${customer.id}` : '/api/customers'
      const method = customer ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error desconocido')
      }
      const saved: Customer = await res.json()
      toast.success(customer ? 'Cliente actualizado' : 'Cliente creado')
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
          <h2 className="modal-title">{customer ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <button className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="form-label">Nombre<Req /></label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Ej: Juan García"
            />
          </div>

          <div>
            <label className="form-label">Dirección<Req /></label>
            <input
              className="form-input"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              minLength={3}
              placeholder="Ej: Av. Corrientes 1234"
            />
          </div>

          <div>
            <label className="form-label">Teléfono</label>
            <input
              className="form-input"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="11 2233-4455"
              maxLength={13}
            />
          </div>

          <div>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              inputMode="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>

          <div>
            <label className="form-label">Barrio</label>
            <input
              className="form-input"
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              placeholder="Ej: Palermo"
            />
          </div>

          <div>
            <label className="form-label">Notas de entrega</label>
            <textarea
              className="form-input"
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder="Ej: Tocar timbre del depto B, casa con portón verde"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label className="form-label">Tipo de cliente</label>
            <select
              className="form-input"
              value={customerType}
              onChange={e => setCustomerType(e.target.value as Customer['customer_type'])}
            >
              <option value="minorista">Minorista</option>
              <option value="mayorista">Mayorista</option>
              <option value="restaurante">Restaurante</option>
            </select>
          </div>

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
