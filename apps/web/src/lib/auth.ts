import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'
const API_PREFIX = '/api/v1'

export type InternalRole = 'ADMIN' | 'SECRETARIA' | 'PADRE'

export type InternalUser = {
  id: string
  name: string
  username: string
  email: string
  role: InternalRole
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
}

export function canAccess(role: InternalRole, route: InternalRouteKey) {
  return INTERNAL_ROUTES[route].roles.includes(role)
}

type InternalRouteConfig = {
  href: string
  label: string
  roles: InternalRole[]
}

const roles = (...items: InternalRole[]): InternalRole[] => items

export const INTERNAL_ROUTES = {
  dashboard: {
    href: '/gestor',
    label: 'Inicio',
    roles: roles('ADMIN', 'SECRETARIA', 'PADRE'),
  },
  agenda: {
    href: '/gestor/agenda',
    label: 'Agenda',
    roles: roles('ADMIN', 'SECRETARIA', 'PADRE'),
  },
  configuracoes: {
    href: '/gestor/configuracoes',
    label: 'Configuracoes',
    roles: roles('ADMIN', 'SECRETARIA'),
  },
  padres: {
    href: '/gestor/padres',
    label: 'Padres',
    roles: roles('ADMIN', 'SECRETARIA'),
  },
  disponibilidades: {
    href: '/gestor/disponibilidades',
    label: 'Disponibilidades',
    roles: roles('ADMIN', 'SECRETARIA'),
  },
  bloqueios: {
    href: '/gestor/bloqueios',
    label: 'Bloqueios',
    roles: roles('ADMIN', 'SECRETARIA'),
  },
  qrcode: {
    href: '/gestor/qrcode',
    label: 'QR Code',
    roles: roles('ADMIN', 'SECRETARIA'),
  },
} satisfies Record<string, InternalRouteConfig>

export type InternalRouteKey = keyof typeof INTERNAL_ROUTES
