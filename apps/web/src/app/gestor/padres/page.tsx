import { ManagerPlaceholder } from '@/components/manager-page'
import { PriestsPanel } from '@/components/priests-panel'
import { canAccess, getCurrentUser, hasPermission } from '@/lib/auth'
import { getPriests, getUnlinkedPriestUsers } from '@/lib/manager-api'

export default async function PadresPage() {
  const user = await getCurrentUser()
  if (!user) return null

  if (!canAccess(user, 'padres')) {
    return (
      <ManagerPlaceholder
        user={user}
        routeKey="padres"
        title="Padres"
        description="Seu perfil nao possui permissao para esta area."
      />
    )
  }

  const canManage = hasPermission(user, 'priest.manage')
  const [priests, unlinkedUsers] = await Promise.all([
    getPriests(),
    canManage ? getUnlinkedPriestUsers() : Promise.resolve({ items: [] }),
  ])

  return (
    <PriestsPanel
      priests={priests.items}
      unlinkedUsers={unlinkedUsers.items}
      canManage={canManage}
      canDelete={hasPermission(user, 'priest.delete')}
    />
  )
}
