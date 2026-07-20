import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { AUTH_LOGIN_RATE_LIMIT } from './auth.constants'
import type { AuthenticatedRequest, CookieResponse } from './auth.types'
import { LoginDto } from './dto/login.dto'
import { AuthGuard } from './guards/auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: AUTH_LOGIN_RATE_LIMIT.maxAttempts,
      ttl: AUTH_LOGIN_RATE_LIMIT.windowMs,
    },
  })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: CookieResponse) {
    const session = await this.authService.login(dto)
    this.authService.setSessionCookie(response, session.token)

    return {
      user: session.user,
      expiresAt: session.expiresAt,
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@Res({ passthrough: true }) response: CookieResponse) {
    this.authService.clearSessionCookie(response)
    return { ok: true }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user }
  }

  @Get('session')
  @UseGuards(AuthGuard)
  session(@Req() request: AuthenticatedRequest) {
    return { user: request.user }
  }
}
