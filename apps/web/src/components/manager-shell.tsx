import Link from 'next/link'
import type { ReactNode } from 'react'
import { INTERNAL_ROUTES, InternalUser } from '@/lib/auth'
import { LogoutButton } from './logout-button'

export function ManagerShell({ user, children }: { user: InternalUser; children: ReactNode }) {
  const routes = Object.values(INTERNAL_ROUTES).filter((route) => route.roles.includes(user.role))

  return (
    <main className="manager-shell">
      <aside className="manager-sidebar">
        <Link className="brand manager-brand" href="/gestor">
          <span className="brand-mark" aria-hidden="true">
            <CrossIcon />
          </span>
          <span>SASF Gestor</span>
        </Link>
        <nav className="manager-nav" aria-label="Navegacao gestora">
          {routes.map((route) => (
            <Link key={route.href} href={route.href}>
              {route.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="manager-main">
        <header className="manager-topbar">
          <div>
            <strong>{user.name}</strong>
            <span>{roleLabel(user.role)}</span>
          </div>
          <LogoutButton />
        </header>
        {children}
      </section>
    </main>
  )
}

function CrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 3v12M5 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function roleLabel(role: InternalUser['role']) {
  const labels = {
    ADMIN: 'Administrador',
    SECRETARIA: 'Secretaria',
    PADRE: 'Padre',
  }

  return labels[role]
}
