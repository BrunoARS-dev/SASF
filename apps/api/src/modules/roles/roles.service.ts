import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { UserRole } from '@prisma/client'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto'

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const [roles, permissions] = await Promise.all([
      this.prisma.accessRole.findMany({
        orderBy: { name: 'asc' },
        include: {
          permissions: {
            select: { permissionKey: true },
          },
          _count: { select: { users: true } },
        },
      }),
      this.prisma.permission.findMany({
        orderBy: [{ group: 'asc' }, { name: 'asc' }],
      }),
    ])

    return {
      roles: roles.map((role) => ({
        key: role.key,
        name: role.name,
        description: role.description,
        userCount: role._count.users,
        permissionKeys: role.permissions.map((item) => item.permissionKey),
      })),
      permissions,
    }
  }

  async updatePermissions(
    key: string,
    dto: UpdateRolePermissionsDto,
    actor: AuthenticatedUser,
  ) {
    const roleKey = parseRole(key)
    const requested = [...new Set(dto.permissionKeys ?? [])]

    const role = await this.prisma.accessRole.findUnique({
      where: { key: roleKey },
      select: { key: true },
    })
    if (!role) {
      throw new NotFoundException({
        code: AppErrorCodes.NOT_FOUND,
        message: 'Função não encontrada.',
      })
    }

    if (roleKey === 'ADMIN') {
      for (const required of ['user.manage', 'role.manage']) {
        if (!requested.includes(required)) {
          throw badRequest(
            'A função Administrador deve manter o gerenciamento de usuários e permissões.',
          )
        }
      }
    }

    const validPermissions = await this.prisma.permission.findMany({
      where: { key: { in: requested } },
      select: { key: true },
    })
    if (validPermissions.length !== requested.length) {
      throw badRequest('Uma ou mais permissões são inválidas.')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleKey } })
      if (requested.length > 0) {
        await tx.rolePermission.createMany({
          data: requested.map((permissionKey) => ({ roleKey, permissionKey })),
        })
      }
      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor.id,
          action: 'ROLE_PERMISSIONS_UPDATED',
          entityType: 'AccessRole',
          entityId: roleKey,
          metadataSafe: { permissionKeys: requested },
        },
        tx,
      )
    })

    return { ok: true }
  }
}

function parseRole(value: string): UserRole {
  const normalized = value.toUpperCase()
  if (
    normalized === 'ADMIN' ||
    normalized === 'SECRETARIA' ||
    normalized === 'PADRE'
  ) {
    return normalized
  }

  throw badRequest('Função inválida.')
}

function badRequest(message: string) {
  return new BadRequestException({
    code: AppErrorCodes.BAD_REQUEST,
    message,
  })
}
