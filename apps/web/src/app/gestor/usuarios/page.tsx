import Link from 'next/link'
import { ManagerPlaceholder } from '@/components/manager-page'
import { RolesPermissionsPanel, UsersPanel } from '@/components/user-access-panels'
import { canAccess, getCurrentUser, hasPermission } from '@/lib/auth'
import { getAccessRoles, getUsers } from '@/lib/manager-api'

export default async function UsersAccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  if (!canAccess(user, 'usuarios')) {
    return (
      <ManagerPlaceholder
        user={user}
        routeKey="usuarios"
        title="Usuários e acessos"
        description="Seu perfil não possui permissão para esta área."
      />
    )
  }

  const params = await searchParams
  const canManageRoles = hasPermission(user, 'role.manage')
  const tab = params?.tab === 'permissoes' && canManageRoles ? 'permissoes' : 'usuarios'
  const [users, access] = await Promise.all([getUsers(), getAccessRoles()])

  return (
    <div className="manager-content">
      <section className="manager-title">
        <h1>Usuários e acessos</h1>
        <p>Gerencie contas, funções e os privilégios compartilhados por cada grupo.</p>
      </section>
      <nav className="access-module-tabs" aria-label="Seções de usuários e acessos">
        <Link aria-current={tab === 'usuarios' ? 'page' : undefined} href="/gestor/usuarios?tab=usuarios">Usuários</Link>
        {canManageRoles ? (
          <Link aria-current={tab === 'permissoes' ? 'page' : undefined} href="/gestor/usuarios?tab=permissoes">Funções e permissões</Link>
        ) : null}
      </nav>
      {tab === 'usuarios' ? (
        <UsersPanel users={users.items} roles={access.roles} currentUserId={user.id} />
      ) : (
        <RolesPermissionsPanel roles={access.roles} permissions={access.permissions} />
      )}
    </div>
  )
}
