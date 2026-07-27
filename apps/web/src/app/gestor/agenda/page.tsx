import { ManagerAgenda } from '@/components/manager-agenda'
import { getCurrentUser, hasPermission } from '@/lib/auth'
import { getAgendaDay, getDashboard, getPriests, todayDateOnly } from '@/lib/manager-api'
import type { ManagerPriest } from '@/lib/manager-api'

export default async function AgendaPage({ searchParams }: { searchParams?: Promise<{ date?: string }> }) {
  const user = await getCurrentUser()
  if (!user) return null

  const params = await searchParams
  const date = params?.date ?? todayDateOnly()
  const [year, month] = date.split('-').map(Number)
  const [agenda, priests, dashboard] = await Promise.all([
    getAgendaDay(date),
    hasPermission(user, 'agenda.create_manual')
      ? getPriests()
      : Promise.resolve({ items: [] as ManagerPriest[] }),
    getDashboard({ range: 'month', year, month }),
  ])

  return (
    <ManagerAgenda
      user={user}
      date={date}
      agenda={agenda}
      priests={priests.items}
      pendingDates={dashboard.pendingConfirmationByDate}
    />
  )
}
