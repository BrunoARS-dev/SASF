import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Priest, Prisma } from '@prisma/client'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import { requireFields } from '../../common/validation/required-fields'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePriestDto } from './dto/create-priest.dto'
import { UpdatePriestDto } from './dto/update-priest.dto'

@Injectable()
export class PriestsService {
  constructor(
    private readonly prisma: PrismaService,
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

    return { items: items.map(toPriestResponse), page, limit, total }
  }

  async listUnlinkedUsers() {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'PADRE',
        deletedAt: null,
        OR: [
          { priestProfile: { is: null } },
          { priestProfile: { is: { deletedAt: { not: null } } } },
        ],
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        active: true,
        priestProfile: {
          select: { id: true, deletedAt: true },
        },
      },
    })

    return {
      items: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        active: user.active,
        restorablePriestId: user.priestProfile?.deletedAt
          ? user.priestProfile.id
          : null,
      })),
    }
  }

  async create(dto: CreatePriestDto, actor?: AuthenticatedUser) {
    requireFields(dto as Record<string, unknown>, ['name'])
    const name = normalizeName(dto.name)
    const appointmentDurationMin = validateDuration(dto.appointmentDurationMin)
    const active = dto.active ?? true
    const userId = normalizeOptionalId(dto.userId)

    const priest = await this.prisma.$transaction(async (tx) => {
      if (userId) {
        const user = await this.findEligibleUser(tx, userId)
        if (user.priestProfile?.deletedAt) {
          const restored = await tx.priest.update({
            where: { id: user.priestProfile.id },
            data: {
              name,
              active,
              appointmentDurationMin,
              deletedAt: null,
            },
            select: PRIEST_SELECT,
          })
          await this.record(actor, 'PRIEST_RESTORED', restored, tx)
          return restored
        }
      }

      const created = await tx.priest.create({
        data: {
          name,
          active,
          appointmentDurationMin,
          ...(userId ? { userId } : {}),
        },
        select: PRIEST_SELECT,
      })
      await this.record(actor, 'PRIEST_CREATED', created, tx)
      return created
    })

    return { priest: toPriestResponse(priest) }
  }

  async update(id: string, dto: UpdatePriestDto, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    await this.findExisting(id)
    const data: Prisma.PriestUpdateInput = {}

    if (dto.name !== undefined) data.name = normalizeName(dto.name)
    if (dto.active !== undefined) data.active = Boolean(dto.active)
    if (dto.appointmentDurationMin !== undefined) {
      data.appointmentDurationMin = validateDuration(dto.appointmentDurationMin)
    }

    const userId =
      dto.userId === undefined ? undefined : normalizeOptionalId(dto.userId)

    const priest = await this.prisma.$transaction(async (tx) => {
      if (userId !== undefined) {
        if (userId) {
          await this.findEligibleUser(tx, userId, id)
          data.user = { connect: { id: userId } }
        } else {
          data.user = { disconnect: true }
        }
      }

      const updated = await tx.priest.update({
        where: { id },
        data,
        select: PRIEST_SELECT,
      })
      await this.record(actor, 'PRIEST_UPDATED', updated, tx)
      return updated
    })

    return { priest: toPriestResponse(priest) }
  }

  async remove(id: string, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    await this.findExisting(id)

    await this.prisma.$transaction(async (tx) => {
      await tx.priest.update({
        where: { id },
        data: { active: false, deletedAt: new Date() },
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

  private async findEligibleUser(
    tx: Prisma.TransactionClient,
    userId: string,
    currentPriestId?: string,
  ) {
    const user = await tx.user.findFirst({
      where: { id: userId, role: 'PADRE', deletedAt: null },
      select: {
        id: true,
        priestProfile: { select: { id: true, deletedAt: true } },
      },
    })
    if (!user) throw badRequest('Selecione uma conta ativa com função Padre.')
    if (
      user.priestProfile &&
      !user.priestProfile.deletedAt &&
      user.priestProfile.id !== currentPriestId
    ) {
      throw badRequest('Esta conta já está vinculada a outro perfil de padre.')
    }
    return user
  }

  private async findExisting(
    id: string,
  ): Promise<Pick<Priest, 'id' | 'userId'>> {
    const priest = await this.prisma.priest.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, userId: true },
    })
    if (!priest) {
      throw new NotFoundException({
        code: AppErrorCodes.NOT_FOUND,
        message: 'Padre não encontrado.',
      })
    }
    return priest
  }

  private record(
    actor: AuthenticatedUser | undefined,
    action: string,
    priest: PriestPayload,
    tx: Prisma.TransactionClient,
  ) {
    return this.auditService.recordSafeMutation(
      {
        actorUserId: actor?.id,
        action,
        entityType: 'Priest',
        entityId: priest.id,
        metadataSafe: {
          active: priest.active,
          appointmentDurationMin: priest.appointmentDurationMin,
          linkedUserId: priest.user?.id ?? null,
        },
      },
      tx,
    )
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
      name: true,
      username: true,
      email: true,
      active: true,
    },
  },
} satisfies Prisma.PriestSelect

type PriestPayload = Prisma.PriestGetPayload<{ select: typeof PRIEST_SELECT }>

function toPriestResponse(priest: PriestPayload) {
  return {
    ...priest,
    createdAt: priest.createdAt.toISOString(),
    updatedAt: priest.updatedAt.toISOString(),
  }
}

function normalizeName(value: string | undefined) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) throw badRequest('Nome inválido.')
  return normalized
}

function normalizeOptionalId(value: string | null | undefined) {
  if (value === null || value === undefined || !String(value).trim()) return null
  return String(value).trim()
}

function validateDuration(value: number | undefined): number | null {
  if (value === undefined || value === null) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 10 || parsed > 240) {
    throw badRequest('Duração inválida.')
  }
  return parsed
}

function badRequest(message: string) {
  return new BadRequestException({
    code: AppErrorCodes.BAD_REQUEST,
    message,
  })
}

function boundedPositiveInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}
