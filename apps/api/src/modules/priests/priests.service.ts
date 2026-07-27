import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Priest, Prisma } from '@prisma/client'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import { requireFields } from '../../common/validation/required-fields'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PasswordService } from '../auth/password.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePriestDto } from './dto/create-priest.dto'
import { UpdatePriestDto } from './dto/update-priest.dto'

@Injectable()
export class PriestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const page = boundedPositiveInt(query.page, 1, 1, 500)
    const limit = boundedPositiveInt(query.limit, 50, 1, 100)
    const where: Prisma.PriestWhereInput = { deletedAt: null }

    const [items, total] = await Promise.all([
      this.prisma.priest.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: PRIEST_SELECT,
      }),
      this.prisma.priest.count({ where }),
    ])

    return {
      items: items.map(toPriestResponse),
      page,
      limit,
      total,
    }
  }

  async create(dto: CreatePriestDto, actor?: AuthenticatedUser) {
    requireFields(dto as Record<string, unknown>, ['name', 'username', 'email', 'password'])

    const name = normalizeName(dto.name)
    const username = normalizeUsername(dto.username)
    const email = normalizeEmail(dto.email)
    const password = String(dto.password ?? '')
    const appointmentDurationMin = validateDuration(dto.appointmentDurationMin)

    if (password.length < 8) {
      throw badRequest('Senha deve ter pelo menos 8 caracteres.')
    }

    const active = dto.active ?? true
    const passwordHash = await this.passwordService.hash(password)

    let priest: PriestPayload
    try {
      priest = await this.prisma.$transaction(async (tx) => {
        const matchingUsers = await tx.user.findMany({
          where: {
            OR: [{ username }, { email }],
          },
          select: {
            id: true,
            username: true,
            email: true,
            deletedAt: true,
            priestProfile: {
              select: {
                id: true,
                deletedAt: true,
              },
            },
          },
        })

        const usernameOwner = matchingUsers.find((user) => user.username === username)
        const emailOwner = matchingUsers.find((user) => user.email === email)

        if (usernameOwner && emailOwner && usernameOwner.id !== emailOwner.id) {
          throw badRequest('Usuario e e-mail pertencem a cadastros diferentes.')
        }

        const existingUser = usernameOwner ?? emailOwner
        if (existingUser) {
          const existingPriest = existingUser.priestProfile
          if (!existingUser.deletedAt || !existingPriest?.deletedAt) {
            throw badRequest('Usuario ou e-mail ja cadastrado.')
          }

          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name,
              username,
              email,
              passwordHash,
              role: 'PADRE',
              active,
              deletedAt: null,
            },
          })

          const restored = await tx.priest.update({
            where: { id: existingPriest.id },
            data: {
              name,
              active,
              appointmentDurationMin,
              deletedAt: null,
            },
            select: PRIEST_SELECT,
          })

          await this.auditService.recordSafeMutation(
            {
              actorUserId: actor?.id,
              action: 'PRIEST_RESTORED',
              entityType: 'Priest',
              entityId: restored.id,
              metadataSafe: {
                active: restored.active,
                appointmentDurationMin: restored.appointmentDurationMin,
              },
            },
            tx,
          )

          return restored
        }

        const user = await tx.user.create({
          data: {
            name,
            username,
            email,
            passwordHash,
            role: 'PADRE',
            active,
          },
          select: { id: true },
        })

        const created = await tx.priest.create({
          data: {
            userId: user.id,
            name,
            active,
            appointmentDurationMin,
          },
          select: PRIEST_SELECT,
        })

        await this.auditService.recordSafeMutation(
          {
            actorUserId: actor?.id,
            action: 'PRIEST_CREATED',
            entityType: 'Priest',
            entityId: created.id,
            metadataSafe: {
              active: created.active,
              appointmentDurationMin: created.appointmentDurationMin,
            },
          },
          tx,
        )

        return created
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw badRequest('Usuario ou e-mail ja cadastrado.')
      }

      throw error
    }

    return { priest: toPriestResponse(priest) }
  }

  async update(id: string, dto: UpdatePriestDto, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])

    const existing = await this.findExisting(id)
    const data: Prisma.PriestUpdateInput = {}
    const userData: Prisma.UserUpdateInput = {}

    if (dto.name !== undefined) {
      const name = normalizeName(dto.name)
      data.name = name
      userData.name = name
    }

    if (dto.active !== undefined) {
      data.active = Boolean(dto.active)
      userData.active = Boolean(dto.active)
    }

    if (dto.appointmentDurationMin !== undefined) {
      data.appointmentDurationMin = validateDuration(dto.appointmentDurationMin)
    }

    const priest = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userData,
        })
      }

      const updated = await tx.priest.update({
        where: { id },
        data,
        select: PRIEST_SELECT,
      })

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'PRIEST_UPDATED',
          entityType: 'Priest',
          entityId: id,
          metadataSafe: {
            active: updated.active,
            appointmentDurationMin: updated.appointmentDurationMin,
          },
        },
        tx,
      )

      return updated
    })

    return { priest: toPriestResponse(priest) }
  }

  async remove(id: string, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    const existing = await this.findExisting(id)

    await this.prisma.$transaction(async (tx) => {
      await tx.priest.update({
        where: { id },
        data: {
          active: false,
          deletedAt: new Date(),
        },
      })
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          active: false,
          deletedAt: new Date(),
        },
      })
      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'PRIEST_DELETED',
          entityType: 'Priest',
          entityId: id,
          metadataSafe: { active: false },
        },
        tx,
      )
    })

    return { ok: true }
  }

  private async findExisting(id: string): Promise<Pick<Priest, 'id' | 'userId'>> {
    const priest = await this.prisma.priest.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, userId: true },
    })

    if (!priest) {
      throw new NotFoundException({
        code: AppErrorCodes.NOT_FOUND,
        message: 'Padre nao encontrado.',
      })
    }

    return priest
  }
}

const PRIEST_SELECT = {
  id: true,
  name: true,
  active: true,
  appointmentDurationMin: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      active: true,
    },
  },
} satisfies Prisma.PriestSelect

type PriestPayload = Prisma.PriestGetPayload<{ select: typeof PRIEST_SELECT }>

function toPriestResponse(priest: PriestPayload) {
  return {
    id: priest.id,
    name: priest.name,
    active: priest.active,
    appointmentDurationMin: priest.appointmentDurationMin,
    createdAt: priest.createdAt.toISOString(),
    updatedAt: priest.updatedAt.toISOString(),
    user: priest.user,
  }
}

function normalizeName(value: string | undefined): string {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) {
    throw badRequest('Nome invalido.')
  }

  return normalized
}

function normalizeUsername(value: string | undefined): string {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) {
    throw badRequest('Usuario invalido.')
  }

  return normalized
}

function normalizeEmail(value: string | undefined): string {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized.includes('@')) {
    throw badRequest('E-mail invalido.')
  }

  return normalized
}

function validateDuration(value: number | undefined): number | null {
  if (value === undefined || value === null) {
    return null
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 10 || parsed > 240) {
    throw badRequest('Duracao invalida.')
  }

  return parsed
}

function badRequest(message: string) {
  return new BadRequestException({
    code: AppErrorCodes.BAD_REQUEST,
    message,
  })
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2002'
}

function boundedPositiveInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}
