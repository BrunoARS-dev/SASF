import { ManagerPlaceholder } from '@/components/manager-page'
import { AvailabilitiesPanel } from '@/components/manager-operation-panels'
import { canAccess, getCurrentUser } from '@/lib/auth'
import { getAvailabilities, getPriests } from '@/lib/manager-api'

export default async function DisponibilidadesPage() {
  const user = await getCurrentUser()
  if (!user) return null

  if (!canAccess(user.role, 'disponibilidades')) {
    return (
      <ManagerPlaceholder
        user={user}
        routeKey="disponibilidades"
        title="Disponibilidades"
        description="Seu perfil nao possui permissao para esta area."
      />
    )
  }

  const [priests, availabilities] = await Promise.all([getPriests(), getAvailabilities()])

  return <AvailabilitiesPanel priests={priests.items} availabilities={availabilities.items} />
}
