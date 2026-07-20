import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AppointmentsService } from './appointments.service'

describe('AppointmentsService critical scheduling rules', () => {
  it('rejects public creation when the selected slot is already taken', async () => {
    const startAt = futureUtcDate(5, 10)
    const prisma = createPrismaMock({
      appointmentFindFirst: async (args: any) => {
        if (args.where.faithfulPhone) return null
        if (args.where.priestId) return { id: 'existing-appointment' }
        return null
      },
      availabilityFindMany: async () => [availabilityFor(startAt)],
    })
    const service = createService(prisma)

    await expect(
      service.createPublic({
        faithfulName: 'Maria Silva',
        faithfulPhone: '(11) 99999-9999',
        faithfulLastName: 'Silva',
        startAt: startAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(prisma.appointment.create).not.toHaveBeenCalled()
  })

  it('rejects public creation when the faithful already has one future active appointment', async () => {
    const startAt = futureUtcDate(5, 10)
    const prisma = createPrismaMock({
      appointmentFindFirst: async (args: any) => {
        if (args.where.faithfulPhone) return { id: 'future-appointment' }
        return null
      },
      availabilityFindMany: async () => [availabilityFor(startAt)],
    })
    const service = createService(prisma)

    await expect(
      service.createPublic({
        faithfulName: 'Maria Silva',
        faithfulPhone: '(11) 99999-9999',
        faithfulLastName: 'Silva',
        startAt: startAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(prisma.appointment.create).not.toHaveBeenCalled()
  })

  it('rejects public cancellation outside the configured minimum deadline', async () => {
    const startAt = new Date(Date.now() + 60 * 60 * 1000)
    const prisma = createPrismaMock({
      appointmentCodeFindUnique: async () => ({
        active: true,
        appointment: publicAppointment({ id: 'appointment-1', startAt }),
      }),
    })
    const service = createService(prisma)

    await expect(service.cancelByCode('private-code')).rejects.toBeInstanceOf(BadRequestException)

    expect(prisma.appointment.update).not.toHaveBeenCalled()
    expect(prisma.appointmentCode.updateMany).not.toHaveBeenCalled()
  })

  it('accepts manual creation as an operational override even without a matching availability', async () => {
    const localNineInSaoPaulo = new Date('2026-07-10T12:00:00.000Z')
    const prisma = createPrismaMock({
      appointmentCreate: async () => internalAppointment({ id: 'created-appointment', startAt: localNineInSaoPaulo }),
      availabilityFindMany: async () => [],
      priestFindFirst: async () => ({
        id: 'priest-1',
        appointmentDurationMin: 30,
      }),
    })
    const service = createService(prisma)

    await expect(
      service.createManual({
        faithfulName: 'Maria Silva',
        faithfulPhone: '(11) 99999-9999',
        faithfulLastName: 'Silva',
        startAt: '2026-07-10T09:00',
        priestId: 'priest-1',
      }),
    ).resolves.toEqual({
      code: 'private-code',
      appointment: expect.objectContaining({
        id: 'created-appointment',
        startAt: localNineInSaoPaulo.toISOString(),
      }),
    })

    expect(prisma.appointment.create).toHaveBeenCalled()
    expect(prisma.availability.findMany).not.toHaveBeenCalled()
  })

  it('recovers a private code only when there is exactly one matching appointment', async () => {
    const prisma = createPrismaMock({
      appointmentFindMany: async () => [{ id: 'appointment-1' }],
    })
    const privateCodeService = createPrivateCodeServiceMock('new-private-code')
    const service = createService(prisma, privateCodeService)

    const result = await service.recoverCode({
      faithfulPhone: '(11) 99999-9999',
      faithfulLastName: 'Silva',
      date: '2026-07-10',
    })

    expect(result).toEqual({
      message: expect.any(String),
      code: 'new-private-code',
    })
    expect(prisma.appointmentCode.updateMany).toHaveBeenCalledWith({
      where: { appointmentId: 'appointment-1', active: true },
      data: expect.objectContaining({ active: false }),
    })
    expect(prisma.appointmentCode.upsert).toHaveBeenCalled()
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'APPOINTMENT_CODE_RECOVERED',
        entityId: 'appointment-1',
        metadataSafe: {
          source: 'public',
          matched: true,
        },
      }),
    })
  })

  it('keeps code recovery neutral when there are zero or multiple matches', async () => {
    const noMatchPrisma = createPrismaMock({
      appointmentFindMany: async () => [],
    })
    const multipleMatchPrisma = createPrismaMock({
      appointmentFindMany: async () => [{ id: 'appointment-1' }, { id: 'appointment-2' }],
    })

    const noMatchResult = await createService(noMatchPrisma).recoverCode({
      faithfulPhone: '(11) 99999-9999',
      faithfulLastName: 'Silva',
      date: '2026-07-10',
    })
    const multipleMatchResult = await createService(multipleMatchPrisma).recoverCode({
      faithfulPhone: '(11) 99999-9999',
      faithfulLastName: 'Silva',
      date: '2026-07-10',
    })

    expect(noMatchResult).toEqual({
      message: expect.any(String),
    })
    expect(multipleMatchResult).toEqual(noMatchResult)
    expect(noMatchPrisma.appointmentCode.upsert).not.toHaveBeenCalled()
    expect(multipleMatchPrisma.appointmentCode.upsert).not.toHaveBeenCalled()
  })

  it('soft deletes only cancelled appointments', async () => {
    const prisma = createPrismaMock({
      appointmentFindFirst: async (args: any) => {
        if (args.where.status === 'CANCELADO') return { id: 'cancelled-appointment' }
        return null
      },
    })
    const service = createService(prisma)

    await expect(service.deleteCancelled('cancelled-appointment')).resolves.toEqual({ ok: true })

    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'cancelled-appointment' },
      data: {
        deletedAt: expect.any(Date),
      },
    })
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'APPOINTMENT_DELETED_CANCELLED',
        entityId: 'cancelled-appointment',
      }),
    })
  })
})

function createService(prisma: any, privateCodeService = createPrivateCodeServiceMock()) {
  const auditService = {
    recordSafeMutation: vi.fn(async (input, client = prisma) => {
      await client.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadataSafe: input.metadataSafe,
        },
      })
    }),
  }

  return new AppointmentsService(prisma, privateCodeService as any, auditService as any)
}

function createPrismaMock(overrides: PrismaMockOverrides = {}) {
  const prisma: any = {
    systemSetting: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    appointment: {
      findFirst: vi.fn(overrides.appointmentFindFirst ?? (async () => null)),
      findMany: vi.fn(overrides.appointmentFindMany ?? (async () => [])),
      create: vi.fn(overrides.appointmentCreate ?? (async () => publicAppointment({ id: 'created-appointment' }))),
      update: vi.fn(async () => publicAppointment({ id: 'updated-appointment' })),
      updateMany: vi.fn(async () => ({ count: 0 })),
      count: vi.fn(async () => 0),
    },
    appointmentCode: {
      findUnique: vi.fn(overrides.appointmentCodeFindUnique ?? (async () => null)),
      updateMany: vi.fn(async () => ({ count: 1 })),
      upsert: vi.fn(async () => ({ id: 'appointment-code-1' })),
    },
    availability: {
      findMany: vi.fn(overrides.availabilityFindMany ?? (async () => [])),
    },
    priest: {
      findFirst: vi.fn(overrides.priestFindFirst ?? (async () => null)),
      findMany: vi.fn(overrides.priestFindMany ?? (async () => [])),
    },
    blockedSlot: {
      findFirst: vi.fn(async () => null),
    },
    auditLog: {
      create: vi.fn(async () => ({ id: 'audit-1' })),
    },
    $transaction: vi.fn(async (action: any) => {
      if (typeof action === 'function') {
        return action(prisma)
      }

      return Promise.all(action)
    }),
  }

  return prisma
}

function createPrivateCodeServiceMock(code = 'private-code') {
  return {
    generate: vi.fn(() => code),
    hash: vi.fn((value: string) => `hash:${value}`),
  }
}

function availabilityFor(startAt: Date) {
  return {
    startTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0)),
    endTime: new Date(Date.UTC(1970, 0, 1, 12, 0, 0)),
    priest: {
      id: 'priest-1',
      appointmentDurationMin: 30,
    },
    dayOfWeek: startAt.getUTCDay(),
  }
}

function publicAppointment(input: { id: string; startAt?: Date }) {
  const startAt = input.startAt ?? futureUtcDate(5, 10)

  return {
    id: input.id,
    sequenceNumber: 1,
    startAt,
    endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
    status: 'AGENDADO',
    faithfulName: 'Maria Silva',
    faithfulLastName: 'Silva',
    deletedAt: null,
  }
}

function internalAppointment(input: { id: string; startAt?: Date }) {
  const startAt = input.startAt ?? futureUtcDate(5, 10)

  return {
    ...publicAppointment(input),
    startAt,
    endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
    faithfulPhone: '11999999999',
    cancelledAt: null,
    completedAt: null,
    priest: {
      id: 'priest-1',
      name: 'Padre Jose',
    },
  }
}

function futureUtcDate(daysFromNow: number, hour: number) {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromNow, hour, 0, 0))
}

type PrismaMockOverrides = {
  appointmentFindFirst?: (args: any) => Promise<unknown>
  appointmentFindMany?: (args: any) => Promise<unknown[]>
  appointmentCreate?: (args: any) => Promise<unknown>
  appointmentCodeFindUnique?: (args: any) => Promise<unknown>
  availabilityFindMany?: (args: any) => Promise<unknown[]>
  priestFindFirst?: (args: any) => Promise<unknown>
  priestFindMany?: (args: any) => Promise<unknown[]>
}
