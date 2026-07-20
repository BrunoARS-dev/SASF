import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, PrismaClient } from '@prisma/client'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import { requireFields } from '../../common/validation/required-fields'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto'
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto'

@Injectable()
export class BlockedSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const page = boundedPositiveInt(query.page, 1, 1, 500)
    const limit = boundedPositiveInt(query.limit, 50, 1, 100)
    const where: Prisma.BlockedSlotWhereInput = { deletedAt: null }

    const [items, total] = await Promise.all([
      this.prisma.blockedSlot.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: BLOCKED_SLOT_SELECT,
      }),
      this.prisma.blockedSlot.count({ where }),
    ])

    return {
      items: items.map(toBlockedSlotResponse),
      page,
      limit,
      total,
    }
  }

  async create(dto: CreateBlockedSlotDto, actor: AuthenticatedUser) {
    requireFields(dto as Record<string, unknown>, ['priestId', 'startAt', 'endAt'])

    const startAt = parseDateTime(dto.startAt)
    const endAt = parseDateTime(dto.endAt)
    validateRange(startAt, endAt)

    const blockedSlot = await this.prisma.$transaction(async (tx) => {
      await assertPriestExists(tx, dto.priestId as string)
      const created = await tx.blockedSlot.create({
        data: {
          priestId: String(dto.priestId),
          startAt,
          endAt,
          operationalReason: normalizeOptionalText(dto.operationalReason),
          createdById: actor.id,
        },
        select: BLOCKED_SLOT_SELECT,
      })

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor.id,
          action: 'BLOCKED_SLOT_CREATED',
          entityType: 'BlockedSlot',
          entityId: created.id,
          metadataSafe: {
            priestId: created.priest.id,
            startAt: created.startAt.toISOString(),
            endAt: created.endAt.toISOString(),
            active: created.active,
          },
        },
        tx,
      )

      return created
    })

    return { blockedSlot: toBlockedSlotResponse(blockedSlot) }
  }

  async update(id: string, dto: UpdateBlockedSlotDto, actor: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    await this.assertBlockedSlotExists(id)

    const data: Prisma.BlockedSlotUpdateInput = {}
    if (dto.startAt !== undefined) data.startAt = parseDateTime(dto.startAt)
    if (dto.endAt !== undefined) data.endAt = parseDateTime(dto.endAt)
    if (dto.operationalReason !== undefined) data.operationalReason = normalizeOptionalText(dto.operationalReason)
    if (dto.active !== undefined) data.active = Boolean(dto.active)

    const blockedSlot = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.blockedSlot.update({
        where: { id },
        data,
        select: BLOCKED_SLOT_SELECT,
      })
      validateRange(updated.startAt, updated.endAt)

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor.id,
          action: 'BLOCKED_SLOT_UPDATED',
          entityType: 'BlockedSlot',
          entityId: id,
          metadataSafe: {
            priestId: updated.priest.id,
            startAt: updated.startAt.toISOString(),
            endAt: updated.endAt.toISOString(),
            active: updated.active,
          },
        },
        tx,
      )

      return updated
    })

    return { blockedSlot: toBlockedSlotResponse(blockedSlot) }
  }

  async remove(id: string, actor: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    await this.assertBlockedSlotExists(id)

    await this.prisma.$transaction(async (tx) => {
      await tx.blockedSlot.update({
        where: { id },
        data: {
          active: false,
          deletedAt: new Date(),
        },
      })
      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor.id,
          action: 'BLOCKED_SLOT_DELETED',
          entityType: 'BlockedSlot',
          entityId: id,
          metadataSafe: { active: false },
        },
        tx,
      )
    })

    return { ok: true }
  }

  private async assertBlockedSlotExists(id: string) {
    const blockedSlot = await this.prisma.blockedSlot.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })

    if (!blockedSlot) {
      throw new NotFoundException({
        code: AppErrorCodes.NOT_FOUND,
        message: 'Bloqueio nao encontrado.',
      })
    }
  }
}

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

const BLOCKED_SLOT_SELECT = {
  id: true,
  startAt: true,
  endAt: true,
  operationalReason: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  priest: {
    select: {
      id: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.BlockedSlotSelect

type BlockedSlotPayload = Prisma.BlockedSlotGetPayload<{ select: typeof BLOCKED_SLOT_SELECT }>

function toBlockedSlotResponse(blockedSlot: BlockedSlotPayload) {
  return {
    id: blockedSlot.id,
    startAt: blockedSlot.startAt.toISOString(),
    endAt: blockedSlot.endAt.toISOString(),
    operationalReason: blockedSlot.operationalReason,
    active: blockedSlot.active,
    createdAt: blockedSlot.createdAt.toISOString(),
    updatedAt: blockedSlot.updatedAt.toISOString(),
    priest: blockedSlot.priest,
    createdBy: blockedSlot.createdBy,
  }
}

async function assertPriestExists(tx: TransactionClient, priestId: string) {
  const priest = await tx.priest.findFirst({
    where: {
      id: priestId,
      deletedAt: null,
      active: true,
    },
    select: { id: true },
  })

  if (!priest) {
    throw new NotFoundException({
      code: AppErrorCodes.NOT_FOUND,
      message: 'Padre nao encontrado.',
    })
  }
}

function parseDateTime(value: string | undefined): Date {
  const date = new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message: 'Data invalida.',
    })
  }

  return date
}

function validateRange(startAt: Date, endAt: Date) {
  if (startAt >= endAt) {
    throw new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message: 'Fim deve ser maior que inicio.',
    })
  }
}

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
  return normalized || null
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
