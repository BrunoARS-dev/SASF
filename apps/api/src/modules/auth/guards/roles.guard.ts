import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { UserRole } from '@prisma/client'
import { AppErrorCodes } from '../../../common/errors/app-error-codes'
import { ROLES_KEY } from '../decorators/roles.decorator'
import type { AuthenticatedRequest } from '../auth.types'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!roles || roles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user

    if (user && roles.includes(user.role)) {
      return true
    }

    throw new ForbiddenException({
      code: AppErrorCodes.FORBIDDEN,
      message: 'Acesso não permitido.',
    })
  }
}
