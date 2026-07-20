import { ManagerPlaceholder } from '@/components/manager-page'
import { PriestsPanel } from '@/components/manager-operation-panels'
import { canAccess, getCurrentUser } from '@/lib/auth'
import { getPriests } from '@/lib/manager-api'

export default async function PadresPage() {
  const user = await getCurrentUser()
  if (!user) return null

  if (!canAccess(user.role, 'padres')) {
    return (
      <ManagerPlaceholder
        user={user}
        routeKey="padres"
        title="Padres"
        description="Seu perfil nao possui permissao para esta area."
      />
    )
  }

  const priests = await getPriests()

  return <PriestsPanel priests={priests.items} />
}
