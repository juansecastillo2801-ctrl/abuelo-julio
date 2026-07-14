import { createAdminClient } from '@/lib/supabase/admin'

export type AuditAction =
  // Productos
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'category.created'
  | 'category.updated'
  // Clientes
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  // Pedidos
  | 'order.created'
  | 'order.updated'
  | 'order.cancelled'
  | 'order.delivered'
  // Ventas
  | 'sale.created'
  | 'sale.voided'
  // Stock
  | 'inventory.adjusted'
  | 'inventory.restocked'
  // Equipo
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.role_changed'
  // Config
  | 'settings.updated'
  | 'settings.password_changed'

interface AuditParams {
  userId?: string
  userRole?: string
  userEmail?: string | null
  action: AuditAction
  entity?: string
  entityId?: string
  entityName?: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

export async function logAudit(params: AuditParams) {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      user_id: params.userId ?? null,
      user_role: params.userRole ?? null,
      user_email: params.userEmail ?? null,
      action: params.action,
      entity: params.entity ?? null,
      entity_id: params.entityId ?? null,
      entity_name: params.entityName ?? null,
      details: params.details ?? null,
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
    })
  } catch (err) {
    console.error('Audit log error:', err)
  }
}

export function getRequestMeta(request: Request) {
  return {
    ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        'unknown',
    userAgent: request.headers.get('user-agent') ?? 'unknown',
  }
}
