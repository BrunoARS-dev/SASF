import { ManagerHome } from '@/components/manager-page'
import { getCurrentUser } from '@/lib/auth'
import { getDashboard } from '@/lib/manager-api'

export default async function GestorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const params = await searchParams
  const range =
    params.range === 'year' || params.range === 'all' ? params.range : 'month'
  const year = positiveNumber(params.year)
  const month = positiveNumber(params.month)
  const dashboard = await getDashboard({ range, year, month })

  return <ManagerHome user={user} dashboard={dashboard} />
}

function positiveNumber(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
