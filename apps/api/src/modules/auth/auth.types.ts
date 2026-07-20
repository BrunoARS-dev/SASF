import type { UserRole } from '@prisma/client'

export type AuthenticatedUser = {
  id: string
  name: string
  username: string
  email: string
  role: UserRole
}

export type SessionPayload = {
  sub: string
  role: UserRole
  iat: number
  exp: number
}

export type SessionCookieOptions = {
  httpOnly: true
  sameSite: 'lax'
  secure: boolean
  maxAge: number
  path: string
}

export type CookieResponse = {
  cookie: (name: string, value: string, options: SessionCookieOptions) => unknown
  clearCookie: (
    name: string,
    options: Pick<SessionCookieOptions, 'sameSite' | 'secure' | 'path'>,
  ) => unknown
}

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>
  user?: AuthenticatedUser
}
