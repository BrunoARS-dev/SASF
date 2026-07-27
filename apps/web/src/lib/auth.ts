import { cookies } from 'next/headers'
import { hasPermission } from './permissions'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'
const API_PREFIX = '/api/v1'

export type InternalRole = 'ADMIN' | 'SECRETARIA' | 'PADRE'

export type InternalUser = {
  id: string
  name: string
  username: string
  email: string
  role: InternalRole
  permissions: string[]
}

export type AuthSession = {
  user: InternalUser
}

export async function getCurrentUser(): Promise<InternalUser | null> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')

  if (!cookieHeader) {
    return null
  }

  try {
    const response = await fetch(`${API_URL}${API_PREFIX}/auth/session`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as AuthSession
    return data.user
  } catch (error) {
    console.warn('[auth] Nao foi possivel consultar a sessao na API.', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export { hasPermission }

export function canAccess(user: InternalUser, route: InternalRouteKey) {
  return hasPermission(user, INTERNAL_ROUTES[route].permission)
}

type InternalRouteConfig = {
  href: string
  label: string
  permission: string
}

export const INTERNAL_ROUTES = {
  dashboard: {
    href: '/gestor',
    label: 'Inicio',
    permission: 'dashboard.view',
  },
  agenda: {
    href: '/gestor/agenda',
    label: 'Agenda',
    permission: 'agenda.view',
  },
  configuracoes: {
    href: '/gestor/configuracoes',
    label: 'Configuracoes',
    permission: 'settings.manage',
  },
  padres: {
    href: '/gestor/padres',
    label: 'Padres',
    permission: 'priest.view',
  },
  disponibilidades: {
    href: '/gestor/disponibilidades',
    label: 'Disponibilidades',
    permission: 'availability.manage',
  },
  bloqueios: {
    href: '/gestor/bloqueios',
    label: 'Bloqueios',
    permission: 'blocked_slot.manage',
  },
  qrcode: {
    href: '/gestor/qrcode',
    label: 'QR Code',
    permission: 'qrcode.manage',
  },
  usuarios: {
    href: '/gestor/usuarios',
    label: 'Usuários e acessos',
    permission: 'user.manage',
  },
} satisfies Record<string, InternalRouteConfig>

export type InternalRouteKey = keyof typeof INTERNAL_ROUTES
