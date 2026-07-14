'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface ChartPoint {
  date: string
  amount: number
  count: number
}

function CustomTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
  metric: 'amount' | 'count'
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const date = new Date(d.date + 'T12:00:00')
  const label = `${date.getDate()}/${date.getMonth() + 1}`
  const value =
    metric === 'amount'
      ? formatCurrency(d.amount)
      : `${d.count} ${d.count === 1 ? 'venta' : 'ventas'}`
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '8px 12px',
      }}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 2px 0' }}>{label}</p>
      <p style={{ color: 'var(--accent-color)', fontSize: '14px', fontWeight: 600, margin: 0 }}>
        {value}
      </p>
    </div>
  )
}

export function SalesChart({
  data,
  metric,
  weekly,
}: {
  data: ChartPoint[]
  metric: 'amount' | 'count'
  weekly: boolean
}) {
  const hasData = data.some(d => (metric === 'amount' ? d.amount > 0 : d.count > 0))

  if (!hasData) {
    return (
      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '14px',
          padding: '32px 0',
          textAlign: 'center',
        }}
      >
        Sin datos para el período
      </p>
    )
  }

  // Smart interval: show all ticks when few points, thin out for longer periods
  const xInterval = weekly ? 0 : data.length <= 10 ? 0 : data.length <= 20 ? 1 : 2

  return (
    <div style={{ height: '220px', marginTop: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid
            stroke="var(--border-light)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            interval={xInterval}
            tickFormatter={(value: string) => {
              const d = new Date(value + 'T12:00:00')
              return weekly
                ? `${d.getDate()}/${d.getMonth() + 1}`
                : `${d.getDate()}`
            }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tickFormatter={(v: number) =>
              metric === 'amount' ? formatCurrency(v) : Math.round(v).toString()
            }
            width={metric === 'amount' ? 68 : 24}
          />
          <Tooltip
            content={props => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as unknown as Array<{ payload: ChartPoint }>}
                metric={metric}
              />
            )}
            cursor={{ fill: 'var(--accent-glow)' }}
          />
          <Bar
            dataKey={metric === 'amount' ? 'amount' : 'count'}
            fill="var(--accent-color)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
