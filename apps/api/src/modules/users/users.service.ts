import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, UserRole } from '@prisma/client'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import { requireFields } from '../../common/validation/required-fields'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PasswordService } from '../auth/password.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { ResetUserPasswordDto } from './dto/reset-user-password.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  async list(_query: PaginationQueryDto) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: USER_SELECT,
    })

    return { items: users.map(toUserResponse) }
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    requireFields(dto as Record<string, unknown>, [
      'name',
      'username',
      'email',
      'password',
      'role',
    ])

    const password = String(dto.password ?? '')
    if (password.length < 8) {
      throw badRequest('Senha deve ter pelo menos 8 caracteres.')
    }

    const role = validateRole(dto.role)
    const input = {
      name: normalizeName(dto.name),
      username: normalizeUsername(dto.username),
      email: normalizeEmail(dto.email),
      passwordHash: await this.passwordService.hash(password),
      role,
      active: dto.active ?? true,
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: input,
          select: USER_SELECT,
        })
        await this.auditService.recordSafeMutation(
          {
            actorUserId: actor.id,
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: created.id,
            metadataSafe: { role: created.role, active: created.active },
          },
          tx,
        )
        return created
      })

      return { user: toUserResponse(user) }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw badRequest('Usuário ou e-mail já cadastrado.')
      }
      throw error
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        role: true,
        active: true,
        priestProfile: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    })
    if (!existing) throw notFound()

    const nextRole = dto.role === undefined ? existing.role : validateRole(dto.role)
    const nextActive = dto.active === undefined ? existing.active : Boolean(dto.active)

    if (existing.priestProfile && nextRole !== 'PADRE') {
      throw badRequest('Desvincule o perfil de padre antes de alterar a função.')
    }
    if (id === actor.id && !nextActive) {
      throw badRequest('Você não pode desativar o próprio acesso.')
    }
    if (
      existing.role === 'ADMIN' &&
      existing.active &&
      (nextRole !== 'ADMIN' || !nextActive)
    ) {
      await this.assertAnotherActiveAdmin(id)
    }

    const data: Prisma.UserUpdateInput = {}
    if (dto.name !== undefined) data.name = normalizeName(dto.name)
    if (dto.username !== undefined) data.username = normalizeUsername(dto.username)
    if (dto.email !== undefined) data.email = normalizeEmail(dto.email)
    if (dto.role !== undefined) data.roleDefinition = { connect: { key: nextRole } }
    if (dto.active !== undefined) {
      data.active = nextActive
      if (nextActive !== existing.active) {
        data.sessionVersion = { increment: 1 }
      }
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id },
          data,
          select: USER_SELECT,
        })
        await this.auditService.recordSafeMutation(
          {
            actorUserId: actor.id,
            action: 'USER_UPDATED',
            entityType: 'User',
            entityId: id,
            metadataSafe: { role: updated.role, active: updated.active },
          },
          tx,
        )
        return updated
      })

      return { user: toUserResponse(user) }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw badRequest('Usuário ou e-mail já cadastrado.')
      }
      throw error
    }
  }

  async resetPassword(
    id: string,
    dto: ResetUserPasswordDto,
    actor: AuthenticatedUser,
  ) {
    requireFields({ id, ...dto }, ['id', 'password'])
    const password = String(dto.password ?? '')
    if (password.length < 8) {
      throw badRequest('Senha deve ter pelo menos 8 caracteres.')
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!existingUser) throw notFound()

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          passwordHash: await this.passwordService.hash(password),
          sessionVersion: { increment: 1 },
        },
      })
      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor.id,
          action: 'USER_PASSWORD_RESET',
          entityType: 'User',
          entityId: id,
          metadataSafe: {},
        },
        tx,
      )
    })

    return { ok: true }
  }

  private async assertAnotherActiveAdmin(excludedId: string) {
    const admins = await this.prisma.user.count({
      where: {
        id: { not: excludedId },
        role: 'ADMIN',
        active: true,
        deletedAt: null,
      },
    })
    if (admins === 0) {
      throw badRequest('O sistema deve manter pelo menos um administrador ativo.')
    }
  }
}

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roleDefinition: {
    select: { name: true },
  },
  priestProfile: {
    where: { deletedAt: null },
    select: { id: true, name: true, active: true },
  },
} satisfies Prisma.UserSelect

type UserPayload = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>

function toUserResponse(user: UserPayload) {
  return {
    ...user,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

function validateRole(role: CreateUserDto['role']): UserRole {
  if (role === 'ADMIN' || role === 'SECRETARIA' || role === 'PADRE') return role
  throw badRequest('Função inválida.')
}

function normalizeName(value: string | undefined) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) throw badRequest('Nome inválido.')
  return normalized
}

function normalizeUsername(value: string | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) throw badRequest('Usuário inválido.')
  return normalized
}

function normalizeEmail(value: string | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized.includes('@')) throw badRequest('E-mail inválido.')
  return normalized
}

function notFound() {
  return new NotFoundException({
    code: AppErrorCodes.NOT_FOUND,
    message: 'Usuário não encontrado.',
  })
}

function badRequest(message: string) {
  return new BadRequestException({
    code: AppErrorCodes.BAD_REQUEST,
    message,
  })
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}
