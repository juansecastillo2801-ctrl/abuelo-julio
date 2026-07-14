'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Package, Users, Menu } from 'lucide-react'
import { MoreMenuSheet } from './MoreMenuSheet'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio',   icon: LayoutDashboard, roles: ['admin', 'vendedor'] },
  { href: '/ventas',    label: 'Ventas',    icon: ShoppingCart,    roles: ['admin', 'vendedor'] },
  { href: '/stock',     label: 'Stock',     icon: Package,         roles: ['admin'] },
  { href: '/clientes',  label: 'Clientes',  icon: Users,           roles: ['admin', 'vendedor'] },
]

export function DashboardBottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(i => i.roles.includes(role))

  return (
    <>
      <nav className="bottom-nav show-mobile-only">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={`bottom-nav-item${active ? ' active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          )
        })}

        <button
          className="bottom-nav-item"
          onClick={() => setMoreOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
          }}
        >
          <Menu size={20} />
          <span>Más</span>
        </button>
      </nav>

      {moreOpen && (
        <MoreMenuSheet role={role} onClose={() => setMoreOpen(false)} />
      )}
    </>
  )
}
