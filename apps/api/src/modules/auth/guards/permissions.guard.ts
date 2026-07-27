import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppErrorCodes } from '../../../common/errors/app-error-codes'
import { PrismaService } from '../../prisma/prisma.service'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import type { AuthenticatedRequest } from '../auth.types'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!permissions || permissions.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const role = request.user?.role
    if (!role) {
      throw this.forbidden()
    }

    const granted = await this.prisma.rolePermission.count({
      where: {
        roleKey: role,
        permissionKey: { in: permissions },
      },
    })

    if (granted === new Set(permissions).size) {
      return true
    }

    throw this.forbidden()
  }

  private forbidden() {
    return new ForbiddenException({
      code: AppErrorCodes.FORBIDDEN,
      message: 'Acesso não permitido.',
    })
  }
}
