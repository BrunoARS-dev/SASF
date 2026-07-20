import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AppErrorCodes } from '../../../common/errors/app-error-codes'
import { AuthService } from '../auth.service'
import type { AuthenticatedRequest } from '../auth.types'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.authService.getTokenFromCookieHeader(request.headers.cookie)

    if (!token) {
      throw this.unauthorized()
    }

    const user = await this.authService.getUserFromSessionToken(token)

    if (!user) {
      throw this.unauthorized()
    }

    request.user = user
    return true
  }

  private unauthorized() {
    return new UnauthorizedException({
      code: AppErrorCodes.UNAUTHORIZED,
      message: 'Sessão inválida ou expirada.',
    })
  }
}
