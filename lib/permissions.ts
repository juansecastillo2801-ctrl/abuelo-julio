import { Role } from './types'

type Permission =
  | 'view_dashboard'
  | 'view_sales_stats'
  | 'manage_products'
  | 'manage_categories'
  | 'manage_customers'
  | 'create_orders'
  | 'manage_orders'
  | 'create_sales'
  | 'void_sales'
  | 'manage_inventory'
  | 'view_stock'
  | 'manage_payments'
  | 'view_payments'
  | 'manage_team'
  | 'change_config'
  | 'view_audit_log'
  | 'export_data'
  | 'manage_prices'
  | 'view_costs'

const PERMISSIONS: Record<Permission, Role[]> = {
  view_dashboard:     ['admin', 'vendedor'],
  view_sales_stats:   ['admin'],
  manage_products:    ['admin'],
  manage_categories:  ['admin'],
  manage_customers:   ['admin', 'vendedor'],
  create_orders:      ['admin', 'vendedor'],
  manage_orders:      ['admin', 'vendedor'],
  create_sales:       ['admin', 'vendedor'],
  void_sales:         ['admin'],
  manage_inventory:   ['admin'],
  view_stock:         ['admin', 'vendedor'],
  manage_payments:    ['admin', 'vendedor'],
  view_payments:      ['admin', 'vendedor'],
  manage_team:        ['admin'],
  change_config:      ['admin'],
  view_audit_log:     ['admin'],
  export_data:        ['admin'],
  manage_prices:      ['admin'],
  view_costs:         ['admin'],
}

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false
}
