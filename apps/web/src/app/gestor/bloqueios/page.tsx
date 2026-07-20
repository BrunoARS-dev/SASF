import { ManagerPlaceholder } from '@/components/manager-page'
import { BlockedSlotsPanel } from '@/components/manager-operation-panels'
import { canAccess, getCurrentUser } from '@/lib/auth'
import { getBlockedSlots, getPriests } from '@/lib/manager-api'

export default async function BloqueiosPage() {
  const user = await getCurrentUser()
  if (!user) return null

  if (!canAccess(user.role, 'bloqueios')) {
    return (
      <ManagerPlaceholder
        user={user}
        routeKey="bloqueios"
        title="Bloqueios"
        description="Seu perfil nao possui permissao para esta area."
      />
    )
  }

  const [priests, blockedSlots] = await Promise.all([getPriests(), getBlockedSlots()])

  return <BlockedSlotsPanel priests={priests.items} blockedSlots={blockedSlots.items} />
}
