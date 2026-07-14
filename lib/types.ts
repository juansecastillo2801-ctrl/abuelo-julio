// ─── Roles ───────────────────────────────────────────────────────────────────
export type Role = 'admin' | 'vendedor'

// ─── Users ───────────────────────────────────────────────────────────────────
export interface User {
  id: string
  auth_user_id: string | null
  email: string
  display_name: string
  role: Role
  phone: string | null
  is_active: boolean
  color: string | null
  created_at: string
}

// Paleta fija de colores identificatorios por vendedor
export const SELLER_COLORS = [
  { hex: '#60A5FA', name: 'Azul' },
  { hex: '#C084FC', name: 'Violeta' },
  { hex: '#F472B6', name: 'Rosa' },
  { hex: '#FB923C', name: 'Naranja' },
  { hex: '#2DD4BF', name: 'Verde agua' },
  { hex: '#38BDF8', name: 'Celeste' },
  { hex: '#A3E635', name: 'Lima' },
  { hex: '#FB7185', name: 'Coral' },
] as const

// ─── Customers ───────────────────────────────────────────────────────────────
export interface Customer {
  id: string
  customer_number: number
  name: string
  address: string
  phone: string | null
  email: string | null
  neighborhood: string | null
  delivery_notes: string | null
  customer_type: 'minorista' | 'mayorista' | 'restaurante'
  needs_review: boolean
  review_reason: string | null
  is_active: boolean
  created_at: string
}

// ─── Products ────────────────────────────────────────────────────────────────
export interface ProductCategory {
  id: string
  name: string
  sort_order: number
}

export interface Product {
  id: string
  category_id: string | null
  name: string
  description: string | null
  unit: 'kg' | 'unidad' | 'paquete'
  price: number
  cost: number | null
  sku: string | null
  is_active: boolean
  created_at: string
  // joined
  category?: Pick<ProductCategory, 'id' | 'name'>
}

// ─── Inventory ───────────────────────────────────────────────────────────────
export interface Inventory {
  id: string
  product_id: string
  current_stock: number
  min_stock: number
  last_restock_at: string | null
  updated_at: string
  // joined
  product?: Pick<Product, 'id' | 'name' | 'unit' | 'cost'>
}

export type MovementType = 'compra' | 'venta' | 'ajuste' | 'merma'

export interface InventoryMovement {
  id: string
  product_id: string
  quantity: number
  movement_type: MovementType
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  // joined
  product?: Pick<Product, 'id' | 'name'>
  user_name?: string | null
  user?: { id: string; display_name: string; color: string | null } | null
  sale?: { id: string; sale_number: number; customer?: Pick<Customer, 'id' | 'name'> | null } | null
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export type OrderStatus = 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'entregado' | 'cancelado'
export type DeliveryType = 'retiro' | 'reparto'

export interface Order {
  id: string
  customer_id: string | null
  order_number: number
  status: OrderStatus
  delivery_date: string | null
  delivery_type: DeliveryType
  notes: string | null
  total: number
  created_by: string | null
  created_at: string
  // joined
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  // joined
  product?: Pick<Product, 'id' | 'name' | 'unit'>
}

// ─── Sales ───────────────────────────────────────────────────────────────────
export type SaleType = 'mostrador' | 'reparto' | 'pedido'
export type PaymentMethod = 'efectivo' | 'transferencia'
export type PaymentStatus = 'pagado' | 'pendiente'
export type SaleStatus = 'pedir' | 'encargado' | 'almacenado' | 'entregado' | 'cancelado'
export type SupplierPaymentStatus = 'por_pagar' | 'pagado'

export interface Sale {
  id: string
  customer_id: string
  order_id: string | null
  sale_number: number
  sale_type: SaleType
  status: SaleStatus
  delivered_at: string | null
  subtotal: number
  discount: number
  total: number
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  paid_at: string | null
  supplier_payment_status: SupplierPaymentStatus
  supplier_paid_at: string | null
  notes: string | null
  sold_by: string | null
  previous_status: string | null
  created_at: string
  // joined
  customer?: Pick<Customer, 'id' | 'name' | 'address'>
  items?: SaleItem[]
  seller?: { id: string; display_name: string; color: string | null } | null
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  quantity_requested: number
  unit_price: number
  subtotal: number
  // joined
  product?: Pick<Product, 'id' | 'name' | 'unit' | 'cost'>
}

// ─── Audit ───────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string
  user_id: string | null
  user_email: string | null
  user_role: string | null
  action: string
  entity: string | null
  entity_id: string | null
  entity_name: string | null
  details: Record<string, unknown> | null
  ip: string | null
  user_agent: string | null
  created_at: string
}
