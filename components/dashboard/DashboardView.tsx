'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatCurrencyShort, formatWeight } from '@/lib/utils'
import { SalesChart } from './SalesChart'

function formatKg(kg: number): string {
  return kg % 1 === 0 ? `${kg} kg` : `${kg.toFixed(1)} kg`
}

const PERIOD_OPTIONS = [
  { value: 'this-month', label: 'Este mes' },
  { value: 'last-month', label: 'Mes anterior' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'custom', label: 'Personalizado' },
]

interface KPI {
  current: number
  previous?: number
}

export interface ChartPoint {
  date: string
  amount: number
  count: number
}

export interface TopClient {
  id: string
  name: string
  total: number
  count: number
}

export interface TopProduct {
  id: string
  name: string
  kg: number
  total: number
  count: number
}

interface DashboardViewProps {
  period: string
  from?: string
  to?: string
  scope: 'team' | 'mine'
  realizedProfit: KPI
  projectedProfit: { current: number }
  salesTotal: KPI
  kgSold: KPI
  chartData: ChartPoint[]
  weeklyChart: boolean
  topClients: TopClient[]
  topProducts: TopProduct[]
}

function Comparison({ current, previous }: KPI) {
  if (!previous || previous === 0) return null
  const diff = current - previous
  const pct = Math.abs((diff / previous) * 100)
  const positive = diff >= 0
  return (
    <span
      className="kpi-comparison"
      style={{ color: positive ? 'var(--success)' : 'var(--danger)' }}
    >
      {positive ? '▲' : '▼'} {pct.toFixed(1)}% vs período anterior
    </span>
  )
}

export function DashboardView({
  period,
  from,
  to,
  scope,
  realizedProfit,
  projectedProfit,
  salesTotal,
  kgSold,
  chartData,
  weeklyChart,
  topClients,
  topProducts,
}: DashboardViewProps) {
  const router = useRouter()
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')
  const [showCustom, setShowCustom] = useState(period === 'custom')
  const [chartMetric, setChartMetric] = useState<'amount' | 'count'>('amount')

  function buildUrl(nextPeriod: string, nextScope: 'team' | 'mine', f?: string, t?: string) {
    const params = new URLSearchParams()
    params.set('period', nextPeriod)
    if (nextPeriod === 'custom') {
      if (f) params.set('from', f)
      if (t) params.set('to', t)
    }
    if (nextScope === 'mine') params.set('scope', 'mine')
    return `/dashboard?${params.toString()}`
  }

  function selectPeriod(p: string) {
    if (p === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    router.push(buildUrl(p, scope))
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    router.push(buildUrl('custom', scope, customFrom, customTo))
  }

  function selectScope(s: 'team' | 'mine') {
    router.push(buildUrl(period, s, customFrom, customTo))
  }

  const emptyMsg = (
    <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '24px 0', textAlign: 'center' }}>
      Sin ventas en este período
    </p>
  )

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
      </div>

      {/* Period selector + scope toggle */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '2px' }}>
            {PERIOD_OPTIONS.map(opt => {
              const isActive = period === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => selectPeriod(opt.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    border: isActive ? 'none' : '1px solid var(--border-color)',
                    backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                    color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scope toggle — Equipo / Mis números */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'var(--bg-card-hover)',
          border: '1px solid var(--border-color)',
          borderRadius: '999px',
          padding: '2px',
          flexShrink: 0,
        }}>
          {(['team', 'mine'] as const).map(s => (
            <button
              key={s}
              onClick={() => selectScope(s)}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                backgroundColor: scope === s ? 'var(--accent-color)' : 'transparent',
                color: scope === s ? 'var(--bg-primary)' : 'var(--text-muted)',
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              {s === 'team' ? 'Equipo' : 'Mis números'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
            marginBottom: '20px',
            padding: '14px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Desde
            </label>
            <input
              type="date"
              className="form-input"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Hasta
            </label>
            <input
              type="date"
              className="form-input"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
          >
            Aplicar
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div className="stat-card">
          <p className="stat-card-label">Ganancia realizada</p>
          <p className="stat-card-value">{formatCurrency(realizedProfit.current)}</p>
          <Comparison {...realizedProfit} />
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Ganancia proyectada</p>
          <p className="stat-card-value">{formatCurrency(projectedProfit.current)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Ventas del período</p>
          <p className="stat-card-value">{formatCurrency(salesTotal.current)}</p>
          <Comparison {...salesTotal} />
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Kg vendidos</p>
          <p className="stat-card-value">{formatWeight(kgSold.current)}</p>
          <Comparison {...kgSold} />
        </div>
      </div>

      {/* Top lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
        {/* Top clientes */}
        <div className="dashboard-section" style={{ minWidth: 0 }}>
          <h2 className="dashboard-section-title">Top clientes</h2>
          {topClients.length === 0 ? emptyMsg : (
            <div className="top-list">
              {topClients.map((client, i) => (
                <div key={client.id} className="top-item">
                  <div className="top-item-rank">{i + 1}</div>
                  <div className="top-item-body">
                    <p className="top-item-name">{client.name}</p>
                    <div className="top-item-meta">
                      <span className="top-item-value">{formatCurrencyShort(client.total)}</span>
                      <span className="top-item-extra">· {client.count} {client.count === 1 ? 'venta' : 'ventas'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top productos */}
        <div className="dashboard-section" style={{ minWidth: 0 }}>
          <h2 className="dashboard-section-title">Top productos</h2>
          {topProducts.length === 0 ? emptyMsg : (
            <div className="top-list">
              {topProducts.map((product, i) => (
                <div key={product.id} className="top-item">
                  <div className="top-item-rank">{i + 1}</div>
                  <div className="top-item-body">
                    <p className="top-item-name">{product.name}</p>
                    <div className="top-item-meta">
                      <span className="top-item-value">{formatCurrencyShort(product.total)}</span>
                      <span className="top-item-extra">· {formatKg(product.kg)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart — full width at the bottom */}
      <div className="dashboard-section">
        <div className="chart-header">
          <h2 className="dashboard-section-title" style={{ margin: 0 }}>
            {chartMetric === 'amount'
              ? (weeklyChart ? 'Ventas por semana' : 'Ventas por día')
              : (weeklyChart ? 'Cant. de ventas por semana' : 'Cant. de ventas por día')
            }
          </h2>
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--bg-card-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            padding: '2px',
          }}>
            {(['amount', 'count'] as const).map(m => (
              <button
                key={m}
                onClick={() => setChartMetric(m)}
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  backgroundColor: chartMetric === m ? 'var(--accent-color)' : 'transparent',
                  color: chartMetric === m ? 'var(--bg-primary)' : 'var(--text-muted)',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                {m === 'amount' ? '$ Facturación' : '# Ventas'}
              </button>
            ))}
          </div>
        </div>
        <SalesChart data={chartData} metric={chartMetric} weekly={weeklyChart} />
      </div>
    </div>
  )
}
