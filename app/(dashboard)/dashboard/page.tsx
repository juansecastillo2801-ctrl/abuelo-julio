import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPeriodDates, getPreviousPeriodRange } from '@/lib/utils'
import { DashboardView } from '@/components/dashboard/DashboardView'
import type { ChartPoint, TopClient, TopProduct } from '@/components/dashboard/DashboardView'

type ProductRow = { id: string; name?: string; cost: number | null } | null
type SaleItemRow = {
  id: string
  quantity: number
  unit_price: number
  product: ProductRow | ProductRow[]
}
type CustomerRow = { id: string; name: string } | null
type SaleRow = {
  id: string
  total: number
  status: string
  payment_status: string
  supplier_payment_status: string
  created_at: string
  customer_id: string | null
  customer?: CustomerRow | CustomerRow[]
  items?: SaleItemRow[] | null
}

function first<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

function itemCost(item: SaleItemRow): number {
  const p = first(item.product)
  return p?.cost ?? 0
}

function computeProfit(sales: SaleRow[]): number {
  return sales.reduce((sum, s) => {
    return (
      sum +
      (s.items ?? []).reduce((iSum, item) => {
        return iSum + (item.unit_price - itemCost(item)) * item.quantity
      }, 0)
    )
  }, 0)
}

function computeSalesTotal(sales: SaleRow[]): number {
  return sales.reduce((sum, s) => sum + Number(s.total), 0)
}

function computeKgSold(sales: SaleRow[]): number {
  return sales.reduce(
    (sum, s) =>
      sum + (s.items ?? []).reduce((iSum, item) => iSum + Number(item.quantity), 0),
    0,
  )
}

function buildChartData(sales: SaleRow[], from: Date, to: Date): { data: ChartPoint[]; weekly: boolean } {
  const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000)
  const weekly = diffDays > 31

  if (!weekly) {
    const days = new Map<string, { amount: number; count: number }>()
    const cur = new Date(from)
    cur.setHours(0, 0, 0, 0)
    const end = new Date(to)
    while (cur <= end) {
      days.set(cur.toISOString().slice(0, 10), { amount: 0, count: 0 })
      cur.setDate(cur.getDate() + 1)
    }
    for (const s of sales) {
      const key = s.created_at.slice(0, 10)
      const bucket = days.get(key)
      if (bucket) {
        bucket.amount += Number(s.total)
        bucket.count++
      }
    }
    const data = Array.from(days.entries()).map(([date, v]) => ({ date, ...v }))
    return { data, weekly }
  }

  // Weekly grouping
  function getWeekKey(d: Date): string {
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return monday.toISOString().slice(0, 10)
  }

  const weeks = new Map<string, { amount: number; count: number }>()
  for (const s of sales) {
    const key = getWeekKey(new Date(s.created_at))
    const bucket = weeks.get(key)
    if (bucket) {
      bucket.amount += Number(s.total)
      bucket.count++
    } else {
      weeks.set(key, { amount: Number(s.total), count: 1 })
    }
  }
  const data = Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))
  return { data, weekly }
}

function buildTopClients(sales: SaleRow[]): TopClient[] {
  const map = new Map<string, { name: string; total: number; count: number }>()
  for (const s of sales) {
    const customer = first(s.customer)
    if (!customer) continue
    const existing = map.get(customer.id)
    if (existing) {
      existing.total += Number(s.total)
      existing.count++
    } else {
      map.set(customer.id, { name: customer.name, total: Number(s.total), count: 1 })
    }
  }
  return Array.from(map.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
}

function buildTopProducts(sales: SaleRow[]): TopProduct[] {
  const map = new Map<string, { name: string; kg: number; total: number; count: number }>()
  for (const s of sales) {
    for (const item of s.items ?? []) {
      const product = first(item.product)
      if (!product || !product.name) continue
      const revenue = item.unit_price * Number(item.quantity)
      const existing = map.get(product.id)
      if (existing) {
        existing.kg += Number(item.quantity)
        existing.total += revenue
        existing.count++
      } else {
        map.set(product.id, { name: product.name, kg: Number(item.quantity), total: revenue, count: 1 })
      }
    }
  }
  return Array.from(map.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 3)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!appUser) redirect('/login')

  const params = await searchParams
  const period = (params.period as string | undefined) ?? 'this-month'
  const fromParam = params.from as string | undefined
  const toParam = params.to as string | undefined
  const scope: 'team' | 'mine' = (params.scope as string | undefined) === 'mine' ? 'mine' : 'team'

  const { from, to } = getPeriodDates(period, fromParam, toParam)
  const { from: prevFrom, to: prevTo } = getPreviousPeriodRange(from, to)

  let currentQuery = supabase
    .from('sales')
    .select(
      `id, total, status, payment_status, supplier_payment_status, created_at, customer_id,
       customer:customers(id, name),
       items:sale_items(id, quantity, unit_price, product:products(id, name, cost))`,
    )
    .neq('status', 'cancelado')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  let prevQuery = supabase
    .from('sales')
    .select(
      `id, total, status, payment_status, supplier_payment_status, created_at,
       items:sale_items(id, quantity, unit_price, product:products(id, cost))`,
    )
    .neq('status', 'cancelado')
    .gte('created_at', prevFrom.toISOString())
    .lte('created_at', prevTo.toISOString())

  // "Mis números": limitar a las ventas del usuario actual
  if (scope === 'mine') {
    currentQuery = currentQuery.eq('sold_by', appUser.id)
    prevQuery = prevQuery.eq('sold_by', appUser.id)
  }

  const [{ data: rawCurrent }, { data: rawPrev }] = await Promise.all([currentQuery, prevQuery])

  const currentSales = (rawCurrent ?? []) as SaleRow[]
  const prevSales = (rawPrev ?? []) as SaleRow[]

  const realizedFilter = (s: SaleRow) =>
    s.status === 'entregado' &&
    s.payment_status === 'pagado' &&
    s.supplier_payment_status === 'pagado'

  const currentRealized = currentSales.filter(realizedFilter)
  const prevRealized = prevSales.filter(realizedFilter)

  const realizedProfitCurrent = computeProfit(currentRealized)
  const realizedProfitPrev = computeProfit(prevRealized)
  const projectedProfitCurrent = computeProfit(currentSales)
  const salesTotalCurrent = computeSalesTotal(currentSales)
  const salesTotalPrev = computeSalesTotal(prevSales)
  const kgSoldCurrent = computeKgSold(currentSales)
  const kgSoldPrev = computeKgSold(prevSales)

  const { data: chartData, weekly: weeklyChart } = buildChartData(currentSales, from, to)
  const topClients = buildTopClients(currentSales)
  const topProducts = buildTopProducts(currentSales)

  return (
    <DashboardView
      period={period}
      from={fromParam}
      to={toParam}
      scope={scope}
      realizedProfit={{ current: realizedProfitCurrent, previous: realizedProfitPrev }}
      projectedProfit={{ current: projectedProfitCurrent }}
      salesTotal={{ current: salesTotalCurrent, previous: salesTotalPrev }}
      kgSold={{ current: kgSoldCurrent, previous: kgSoldPrev }}
      chartData={chartData}
      weeklyChart={weeklyChart}
      topClients={topClients}
      topProducts={topProducts}
    />
  )
}
