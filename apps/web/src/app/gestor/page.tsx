import { ManagerHome } from '@/components/manager-page'
import { getCurrentUser } from '@/lib/auth'

export default async function GestorPage() {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  return <ManagerHome user={user} />
}
