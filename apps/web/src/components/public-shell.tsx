import Link from 'next/link'
import type { ReactNode } from 'react'

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="public-shell">
      <header className="public-header">
        <Link className="brand" href="/agendar" aria-label="Ir para agendamento">
          <span className="brand-mark" aria-hidden="true">
            <CrossIcon />
          </span>
          <span>SASF</span>
        </Link>
        <nav className="public-nav" aria-label="Acesso publico">
          <Link href="/agendar">Agendar</Link>
          <Link href="/consultar">Consultar</Link>
          <Link href="/recuperar-codigo">Recuperar codigo</Link>
        </nav>
      </header>
      {children}
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
