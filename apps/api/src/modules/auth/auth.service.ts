import { Injectable, UnauthorizedException } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { User } from '@prisma/client'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import { requireFields } from '../../common/validation/required-fields'
import { PrismaService } from '../prisma/prisma.service'
import { AUTH_SESSION_COOKIE, AUTH_SESSION_TTL_MS, AUTH_SESSION_TTL_SECONDS } from './auth.constants'
import type {
  AuthenticatedUser,
  CookieResponse,
  SessionCookieOptions,
  SessionPayload,
} from './auth.types'
import { LoginDto } from './dto/login.dto'
import { PasswordService } from './password.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async login(dto: LoginDto) {
    const identifier = this.normalizeIdentifier(dto.identifier ?? dto.email ?? dto.username)
    requireFields({ identifier, password: dto.password }, ['identifier', 'password'])

    const user = await this.findUserForLogin(identifier)

    if (!user || !user.active || user.deletedAt) {
      throw this.invalidCredentials()
    }

    const passwordMatches = await this.passwordService.verify(dto.password as string, user.passwordHash)

    if (!passwordMatches) {
      throw this.invalidCredentials()
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS)
    return {
      token: this.signSessionToken({
        sub: user.id,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
      }),
      expiresAt: expiresAt.toISOString(),
      user: this.toAuthenticatedUser(user),
    }
  }

  async getUserFromSessionToken(token: string): Promise<AuthenticatedUser | null> {
    const payload = this.verifySessionToken(token)

    if (!payload) {
      return null
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        active: true,
        deletedAt: null,
      },
    })

    return user ? this.toAuthenticatedUser(user) : null
  }

  setSessionCookie(response: CookieResponse, token: string) {
    response.cookie(AUTH_SESSION_COOKIE, token, this.sessionCookieOptions())
  }

  clearSessionCookie(response: CookieResponse) {
    const { sameSite, secure, path } = this.sessionCookieOptions()
    response.clearCookie(AUTH_SESSION_COOKIE, { sameSite, secure, path })
  }

  getTokenFromCookieHeader(cookieHeader: string | string[] | undefined): string | null {
    const header = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader

    if (!header) {
      return null
    }

    const cookies = header.split(';').map((cookie) => cookie.trim())
    const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${AUTH_SESSION_COOKIE}=`))

    if (!sessionCookie) {
      return null
    }

    return decodeURIComponent(sessionCookie.slice(AUTH_SESSION_COOKIE.length + 1))
  }

  private async findUserForLogin(identifier: string): Promise<User | null> {
    if (identifier.includes('@')) {
      return this.prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
      })
    }

    return this.prisma.user.findUnique({
      where: { username: identifier.toLowerCase() },
    })
  }

  private signSessionToken(payload: SessionPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = this.sign(encodedPayload)
    return `${encodedPayload}.${signature}`
  }

  private verifySessionToken(token: string): SessionPayload | null {
    const [encodedPayload, signature] = token.split('.')

    if (!encodedPayload || !signature || !this.signatureMatches(encodedPayload, signature)) {
      return null
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as SessionPayload

      if (!payload.sub || !payload.role || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
        return null
      }

      return payload
    } catch {
      return null
    }
  }

  private signatureMatches(encodedPayload: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(encodedPayload), 'base64url')
    const actual = Buffer.from(signature, 'base64url')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', this.sessionSecret()).update(encodedPayload).digest('base64url')
  }

  private sessionSecret(): string {
    const secret = process.env.AUTH_SESSION_SECRET

    if (secret) {
      return secret
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SESSION_SECRET obrigatório em produção.')
    }

    return 'dev-only-change-me'
  }

  private sessionCookieOptions(): SessionCookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: AUTH_SESSION_TTL_SECONDS * 1000,
      path: '/',
    }
  }

  private normalizeIdentifier(identifier: string | undefined): string {
    return String(identifier ?? '').trim().toLowerCase()
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  }

  private invalidCredentials() {
    return new UnauthorizedException({
      code: AppErrorCodes.UNAUTHORIZED,
      message: 'Credenciais inválidas.',
    })
  }
}
