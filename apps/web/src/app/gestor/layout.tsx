import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { ManagerShell } from '@/components/manager-shell'
import { getCurrentUser } from '@/lib/auth'

export default async function GestorLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/gestor')
  }

  return <ManagerShell user={user}>{children}</ManagerShell>
}
