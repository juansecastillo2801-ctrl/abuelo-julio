import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatWeight(kg: number): string {
  if (kg >= 1) return `${kg.toFixed(kg % 1 === 0 ? 0 : 1)} kg`
  return `${(kg * 1000).toFixed(0)} g`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-AR').format(n)
}

export function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, digits.length - 8)} ${digits.slice(-8, -4)}-${digits.slice(-4)}`
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function formatCurrencyShort(value: number): string {
  if (value >= 10_000_000) return `$${Math.round(value / 1_000_000)}M`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `$${Math.round(value / 1_000)}k`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value}`
}

export function getPeriodDates(
  period: string,
  from?: string,
  to?: string,
): { from: Date; to: Date } {
  const now = new Date()
  switch (period) {
    case 'last-month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { from: start, to: end }
    }
    case '7d': {
      const start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    }
    case '30d': {
      const start = new Date(now)
      start.setDate(now.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    }
    case 'custom': {
      if (from && to) {
        return {
          from: new Date(from + 'T00:00:00'),
          to: new Date(to + 'T23:59:59'),
        }
      }
      // fall through to this-month
    }
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { from: start, to: end }
    }
  }
}

export function getPreviousPeriodRange(from: Date, to: Date): { from: Date; to: Date } {
  const diff = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - diff)
  return { from: prevFrom, to: prevTo }
}

export function evaluateCustomerCompleteness(
  name: string,
  address: string
): { needs_review: boolean; review_reason: string | null } {
  const reasons: string[] = []

  const nameWords = name.trim().split(/\s+/).filter(w => w.length > 0)
  const hasParenMark = /\([^)]+\)/.test(name)
  if (nameWords.length < 2) reasons.push('falta apellido')
  if (hasParenMark) reasons.push('nombre con marca temporal')

  const addressTrimmed = address.trim()
  const hasNumber = /\d/.test(addressTrimmed)
  if (addressTrimmed.length < 8) reasons.push('dirección muy corta')
  else if (!hasNumber) reasons.push('falta altura en la dirección')

  if (reasons.length === 0) return { needs_review: false, review_reason: null }

  return {
    needs_review: true,
    review_reason: reasons.join(', ').replace(/^./, c => c.toUpperCase()),
  }
}
