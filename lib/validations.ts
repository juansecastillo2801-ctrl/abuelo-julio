import { z } from 'zod'

// ─── Productos ───────────────────────────────────────────────────────────────
export const createProductSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  description: z.string().max(500).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  unit: z.enum(['kg', 'unidad', 'paquete']),
  price: z.number().min(0, 'El precio debe ser positivo'),
  cost: z.number().min(0).optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
})

export const updateProductSchema = createProductSchema.partial()

// ─── Categorías ──────────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  sort_order: z.number().int().min(0).optional(),
})

// ─── Equipo (usuarios) ───────────────────────────────────────────────────────
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido').optional().nullable()

export const createUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['admin', 'vendedor']).optional(),
  color: colorSchema,
})

export const updateUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100).optional(),
  role: z.enum(['admin', 'vendedor']).optional(),
  is_active: z.boolean().optional(),
  color: colorSchema,
})

// ─── Clientes ────────────────────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  address: z.string().min(3, 'La dirección es obligatoria').max(200),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  delivery_notes: z.string().max(500).optional().nullable(),
  customer_type: z.enum(['minorista', 'mayorista', 'restaurante']).optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()

// ─── Pedidos ─────────────────────────────────────────────────────────────────
export const createOrderSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  delivery_date: z.string().optional().nullable(),
  delivery_type: z.enum(['retiro', 'reparto']).optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().positive('La cantidad debe ser positiva'),
    unit_price: z.number().min(0),
  })).min(1, 'El pedido debe tener al menos un item'),
})

// ─── Ventas ──────────────────────────────────────────────────────────────────
export const createSaleSchema = z.object({
  customer_id: z.string().uuid(),
  order_id: z.string().uuid().optional().nullable(),
  sale_type: z.enum(['mostrador', 'reparto', 'pedido']).optional(),
  status: z.enum(['pedir', 'encargado', 'almacenado', 'entregado', 'cancelado']).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().positive(),
    quantity_requested: z.number().positive().optional(),
    unit_price: z.number().min(0),
  })).min(1, 'La venta debe tener al menos un item'),
})

export const updateSaleSchema = z.object({
  status: z.enum(['pedir', 'encargado', 'almacenado', 'entregado', 'cancelado']).optional(),
  payment_status: z.enum(['pagado', 'pendiente']).optional(),
  payment_method: z.enum(['efectivo', 'transferencia']).optional().nullable(),
  supplier_payment_status: z.enum(['por_pagar', 'pagado']).optional(),
  notes: z.string().max(500).optional().nullable(),
})

// ─── Stock ───────────────────────────────────────────────────────────────────
export const adjustStockSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number(),
  movement_type: z.enum(['compra', 'ajuste', 'merma']),
  notes: z.string().max(500).optional().nullable(),
})

// ─── Helper ──────────────────────────────────────────────────────────────────
export function validationError(error: z.ZodError) {
  const messages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
  return { error: 'Datos inválidos', details: messages }
}
