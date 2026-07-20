import { Injectable } from '@nestjs/common'
import type { Prisma, PrismaClient } from '@prisma/client'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto = {}) {
    const page = boundedPositiveInt(query.page, 1, 1, 500)
    const limit = boundedPositiveInt(query.limit, 30, 1, 100)

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorUserId: true,
          action: true,
          entityType: true,
          entityId: true,
          metadataSafe: true,
          occurredAt: true,
        },
      }),
      this.prisma.auditLog.count(),
    ])

    return {
      items: items.map((item) => ({
        ...item,
        occurredAt: item.occurredAt.toISOString(),
      })),
      page,
      limit,
      total,
    }
  }

  async recordSafeMutation(input: AuditMutationInput, client: AuditWriteClient = this.prisma) {
    await client.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadataSafe: sanitizeMetadata(input.metadataSafe),
      },
    })
  }
}

export type AuditMutationInput = {
  actorUserId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadataSafe?: Prisma.InputJsonValue | null
}

type AuditWriteClient = Pick<PrismaClient, 'auditLog'>

const SENSITIVE_METADATA_KEYS = [
  'code',
  'privateCode',
  'codeHash',
  'hash',
  'faithfulName',
  'faithfulPhone',
  'faithfulLastName',
  'phone',
  'name',
  'lastName',
  'password',
  'passwordHash',
  'token',
  'secret',
  'reason',
]

function sanitizeMetadata(value: Prisma.InputJsonValue | null | undefined): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item) ?? null)
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, Prisma.InputJsonValue> = {}

    for (const [key, item] of Object.entries(value)) {
      if (isSensitiveKey(key)) continue

      const sanitizedItem = sanitizeMetadata(item as Prisma.InputJsonValue)
      if (sanitizedItem !== undefined) {
        sanitized[key] = sanitizedItem
      }
    }

    return sanitized
  }

  return value
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase()
  return SENSITIVE_METADATA_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey.toLowerCase()))
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
