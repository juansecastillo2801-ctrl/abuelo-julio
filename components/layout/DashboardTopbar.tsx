'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',  roles: ['admin', 'vendedor'] },
  { href: '/ventas',        label: 'Ventas',      roles: ['admin', 'vendedor'] },
  { href: '/clientes',      label: 'Clientes',    roles: ['admin', 'vendedor'] },
  { href: '/productos',     label: 'Productos',   roles: ['admin', 'vendedor'] },
  { href: '/stock',         label: 'Stock',       roles: ['admin'] },
  { href: '/equipo',        label: 'Equipo',      roles: ['admin'] },
  { href: '/configuracion', label: 'Config',      roles: ['admin', 'vendedor'] },
]

interface DashboardTopbarProps {
  userName: string
  role: 'admin' | 'vendedor'
}

export function DashboardTopbar({ userName, role }: DashboardTopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleBadgeClass = role === 'admin' ? 'role-badge role-badge-admin' : 'role-badge role-badge-vendedor'
  const roleLabel = role === 'admin' ? 'Admin' : 'Vendedor'

  return (
    <header className="topbar">
      <Link href="/dashboard" style={{ marginRight: '16px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Abuelo Julio"
          style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
        />
      </Link>

      <nav className="hidden md:flex topbar-nav">
        {NAV_ITEMS.filter(item => item.roles.includes(role)).map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={`topbar-nav-item${active ? ' active' : ''}`}>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="topbar-right">
        <span className="topbar-username hide-mobile">{userName}</span>
        <span className={`${roleBadgeClass} hide-mobile`}>{roleLabel}</span>
        <ThemeToggle />
        <button className="btn-logout" onClick={handleLogout}>
          Salir
        </button>
      </div>
    </header>
  )
}