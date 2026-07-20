import { ManagerAgenda } from '@/components/manager-agenda'
import { getCurrentUser } from '@/lib/auth'
import { getAgendaDay, getPriests, todayDateOnly } from '@/lib/manager-api'
import type { ManagerPriest } from '@/lib/manager-api'

export default async function AgendaPage({ searchParams }: { searchParams?: Promise<{ date?: string }> }) {
  const user = await getCurrentUser()
  if (!user) return null

  const params = await searchParams
  const date = params?.date ?? todayDateOnly()
  const [agenda, priests] = await Promise.all([
    getAgendaDay(date),
    user.role === 'ADMIN' || user.role === 'SECRETARIA'
      ? getPriests()
      : Promise.resolve({ items: [] as ManagerPriest[] }),
  ])

  return <ManagerAgenda user={user} date={date} agenda={agenda} priests={priests.items} />
}
