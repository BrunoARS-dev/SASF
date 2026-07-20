import Link from 'next/link'
import { canAccess, INTERNAL_ROUTES, InternalRouteKey, InternalUser } from '@/lib/auth'

export function ManagerHome({ user }: { user: InternalUser }) {
  const routes = Object.entries(INTERNAL_ROUTES)
    .filter(([, route]) => route.href !== '/gestor' && route.roles.includes(user.role))
    .map(([key, route]) => ({ key, ...route }))

  return (
    <div className="manager-content">
      <section className="manager-title">
        <h1>Painel gestor</h1>
        <p>Base inicial para acompanhar agenda e acessar as areas permitidas ao seu perfil.</p>
      </section>
      <div className="manager-grid">
        {routes.map((route) => (
          <Link className="manager-card" key={route.key} href={route.href}>
            <strong>{route.label}</strong>
            <span>{description(route.key as InternalRouteKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ManagerPlaceholder({
  user,
  routeKey,
  title,
  description,
}: {
  user: InternalUser
  routeKey: InternalRouteKey
  title: string
  description: string
}) {
  if (!canAccess(user.role, routeKey)) {
    return (
      <div className="manager-content">
        <section className="manager-title">
          <h1>Acesso indisponivel</h1>
          <p>Seu perfil nao possui permissao para esta area.</p>
        </section>
        <Link className="secondary-button manager-back" href="/gestor">
          Voltar ao painel
        </Link>
      </div>
    )
  }

  return (
    <div className="manager-content">
      <section className="manager-title">
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <div className="manager-empty">
        <strong>Base pronta</strong>
        <p>Esta area ja esta protegida por sessao e perfil. O CRUD completo fica para a proxima etapa.</p>
      </div>
    </div>
  )
}

function description(routeKey: InternalRouteKey) {
  const descriptions = {
    dashboard: 'Resumo inicial',
    agenda: 'Acompanhar atendimentos',
    configuracoes: 'Parametros operacionais',
    padres: 'Cadastro de padres',
    disponibilidades: 'Grade de horarios',
    bloqueios: 'Bloqueios de agenda',
    qrcode: 'Acesso publico por QR',
  }

  return descriptions[routeKey]
}
