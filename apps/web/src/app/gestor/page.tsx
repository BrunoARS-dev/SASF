import { ManagerHome } from '@/components/manager-page'
import { getCurrentUser } from '@/lib/auth'
import { getDashboard } from '@/lib/manager-api'

export default async function GestorPage() {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const dashboard = await getDashboard()

  return <ManagerHome user={user} dashboard={dashboard} />
}
