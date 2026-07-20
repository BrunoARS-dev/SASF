import { ManagerPlaceholder } from '@/components/manager-page'
import { SettingsPanel } from '@/components/manager-operation-panels'
import { canAccess, getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/manager-api'

export default async function ConfiguracoesPage() {
  const user = await getCurrentUser()
  if (!user) return null

  if (!canAccess(user.role, 'configuracoes')) {
    return (
      <ManagerPlaceholder
        user={user}
        routeKey="configuracoes"
        title="Configuracoes"
        description="Seu perfil nao possui permissao para esta area."
      />
    )
  }

  const settings = await getSettings()

  return <SettingsPanel settings={settings.items} />
}
