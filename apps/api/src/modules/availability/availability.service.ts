import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { AppointmentStatus, Prisma, PrismaClient } from '@prisma/client'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import {
  combineDateOnlyAndTime,
  getCalendarDayOfWeek,
  getLocalDayBounds,
} from '../../common/time-zone'
import { requireFields } from '../../common/validation/required-fields'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import {
  AvailableDaysQueryDto,
  AvailableTimesQueryDto,
} from './dto/availability-query.dto'
import { CreateAvailabilityDto } from './dto/create-availability.dto'
import { UpdateAvailabilityDto } from './dto/update-availability.dto'

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listPublicDays(query: AvailableDaysQueryDto) {
    requireFields(query as Record<string, unknown>, ['from', 'to'])

    const now = new Date()
    const rules = await this.getSchedulingRules()
    const from = startOfDay(parseDateOnly(query.from as string))
    const requestedTo = startOfDay(parseDateOnly(query.to as string))
    const maxTo = startOfDay(addDays(now, rules.bookingWindowDays))
    const to = requestedTo < maxTo ? requestedTo : maxTo

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw this.badRequest('Periodo invalido.')
    }

    const days: Array<{ date: string; available: boolean }> = []
    for (const day of eachDay(from, to)) {
      const slots = await this.findAvailableSlotsForDate(day, now, rules)
      days.push({ date: toDateOnly(day), available: slots.length > 0 })
    }

    return { days }
  }

  async listPublicTimes(query: AvailableTimesQueryDto) {
    requireFields(query as Record<string, unknown>, ['date'])

    const now = new Date()
    const rules = await this.getSchedulingRules()
    const date = parseDateOnly(query.date as string)

    if (Number.isNaN(date.getTime())) {
      throw this.badRequest('Data invalida.')
    }

    const slots = await this.findAvailableSlotsForDate(date, now, rules)

    return {
      date: toDateOnly(date),
      times: slots.map((slot) => ({
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
        available: true,
      })),
    }
  }

  async listInternal(query: PaginationQueryDto) {
    const page = boundedPositiveInt(query.page, 1, 1, 500)
    const limit = boundedPositiveInt(query.limit, 80, 1, 120)
    const where: Prisma.AvailabilityWhereInput = { deletedAt: null }

    const [items, total] = await Promise.all([
      this.prisma.availability.findMany({
        where,
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: INTERNAL_AVAILABILITY_SELECT,
      }),
      this.prisma.availability.count({ where }),
    ])

    return {
      items: items.map(toInternalAvailability),
      page,
      limit,
      total,
    }
  }

  async create(dto: CreateAvailabilityDto, actor?: AuthenticatedUser) {
    requireFields(dto as Record<string, unknown>, [
      'priestId',
      'dayOfWeek',
      'startTime',
      'endTime',
    ])

    const dayOfWeek = validateDayOfWeek(dto.dayOfWeek)
    const startTime = parseTime(dto.startTime)
    const endTime = parseTime(dto.endTime)

    if (startTime >= endTime) {
      throw this.badRequest('Horario final deve ser maior que o inicial.')
    }

    const availability = await this.prisma.$transaction(async (tx) => {
      await assertPriestExists(tx, dto.priestId as string)
      const created = await tx.availability.create({
        data: {
          priestId: String(dto.priestId),
          dayOfWeek,
          startTime,
          endTime,
        },
        select: INTERNAL_AVAILABILITY_SELECT,
      })
      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'AVAILABILITY_CREATED',
          entityType: 'Availability',
          entityId: created.id,
          metadataSafe: {
            priestId: created.priest.id,
            dayOfWeek: created.dayOfWeek,
            active: created.active,
          },
        },
        tx,
      )

      return created
    })

    return { availability: toInternalAvailability(availability) }
  }

  async update(id: string, dto: UpdateAvailabilityDto, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    await this.assertAvailabilityExists(id)

    const data: Prisma.AvailabilityUpdateInput = {}
    if (dto.dayOfWeek !== undefined) data.dayOfWeek = validateDayOfWeek(dto.dayOfWeek)
    if (dto.startTime !== undefined) data.startTime = parseTime(dto.startTime)
    if (dto.endTime !== undefined) data.endTime = parseTime(dto.endTime)
    if (dto.active !== undefined) data.active = Boolean(dto.active)

    const availability = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.availability.update({
        where: { id },
        data,
        select: INTERNAL_AVAILABILITY_SELECT,
      })

      if (updated.startTime >= updated.endTime) {
        throw this.badRequest('Horario final deve ser maior que o inicial.')
      }

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'AVAILABILITY_UPDATED',
          entityType: 'Availability',
          entityId: id,
          metadataSafe: {
            priestId: updated.priest.id,
            dayOfWeek: updated.dayOfWeek,
            active: updated.active,
          },
        },
        tx,
      )

      return updated
    })

    return { availability: toInternalAvailability(availability) }
  }

  async remove(id: string, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    await this.assertAvailabilityExists(id)

    await this.prisma.$transaction(async (tx) => {
      await tx.availability.update({
        where: { id },
        data: {
          active: false,
          deletedAt: new Date(),
        },
      })
      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'AVAILABILITY_DELETED',
          entityType: 'Availability',
          entityId: id,
          metadataSafe: { active: false },
        },
        tx,
      )
    })

    return { ok: true }
  }

  private async assertAvailabilityExists(id: string) {
    const availability = await this.prisma.availability.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })

    if (!availability) {
      throw new NotFoundException({
        code: AppErrorCodes.NOT_FOUND,
        message: 'Disponibilidade nao encontrada.',
      })
    }
  }

  private async findAvailableSlotsForDate(date: Date, now: Date, rules: SchedulingRules) {
    const day = startOfDay(date)
    const dayBounds = getLocalDayBounds(day)
    const windowStart = new Date(Math.max(dayBounds.start.getTime(), now.getTime() + rules.minimumBookingLeadHours * HOUR_MS))
    const windowEnd = dayBounds.end
    const maxDate = addDays(now, rules.bookingWindowDays)

    if (day > startOfDay(maxDate) || windowStart >= windowEnd) {
      return []
    }

    const dayOfWeek = getCalendarDayOfWeek(day)
    const availabilities = await this.prisma.availability.findMany({
      where: {
        dayOfWeek,
        active: true,
        deletedAt: null,
        priest: {
          active: true,
          deletedAt: null,
          user: {
            active: true,
            deletedAt: null,
          },
        },
      },
      select: {
        startTime: true,
        endTime: true,
        priest: {
          select: {
            id: true,
            appointmentDurationMin: true,
          },
        },
      },
    })

    if (availabilities.length === 0) {
      return []
    }

    const priestIds = [...new Set(availabilities.map((availability) => availability.priest.id))]
    const [appointments, blockedSlots] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          priestId: { in: priestIds },
          startAt: { lt: windowEnd },
          endAt: { gt: dayBounds.start },
          deletedAt: null,
          status: { in: ACTIVE_APPOINTMENT_STATUSES },
        },
        select: { priestId: true, startAt: true, endAt: true },
      }),
      this.prisma.blockedSlot.findMany({
        where: {
          priestId: { in: priestIds },
          active: true,
          deletedAt: null,
          startAt: { lt: windowEnd },
          endAt: { gt: dayBounds.start },
        },
        select: { priestId: true, startAt: true, endAt: true },
      }),
    ])

    const slotsByStart = new Map<string, { startAt: Date; endAt: Date }>()

    for (const availability of availabilities) {
      const durationMinutes = availability.priest.appointmentDurationMin ?? rules.defaultAppointmentDurationMinutes
      const availabilityStart = combineDateOnlyAndTime(day, availability.startTime)
      const availabilityEnd = combineDateOnlyAndTime(day, availability.endTime)

      for (
        let startAt = availabilityStart;
        addMinutes(startAt, durationMinutes) <= availabilityEnd;
        startAt = addMinutes(startAt, durationMinutes)
      ) {
        const endAt = addMinutes(startAt, durationMinutes)

        if (startAt < windowStart || startAt > maxDate) {
          continue
        }

        const conflicts = appointments
          .filter((appointment) => appointment.priestId === availability.priest.id)
          .some((appointment) => overlaps(startAt, endAt, appointment.startAt, appointment.endAt))
        const blocked = blockedSlots
          .filter((blockedSlot) => blockedSlot.priestId === availability.priest.id)
          .some((blockedSlot) => overlaps(startAt, endAt, blockedSlot.startAt, blockedSlot.endAt))

        if (!conflicts && !blocked) {
          slotsByStart.set(startAt.toISOString(), { startAt, endAt })
        }
      }
    }

    return [...slotsByStart.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
  }

  private async getSchedulingRules(): Promise<SchedulingRules> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'minimum_booking_lead_hours',
            'booking_window_days',
            'default_appointment_duration_minutes',
          ],
        },
      },
      select: { key: true, value: true },
    })

    const value = (key: string, fallback: number) => {
      const setting = settings.find((item) => item.key === key)
      const parsed = Number(setting?.value)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
    }

    return {
      minimumBookingLeadHours: value('minimum_booking_lead_hours', 2),
      bookingWindowDays: value('booking_window_days', 30),
      defaultAppointmentDurationMinutes: value('default_appointment_duration_minutes', 30),
    }
  }

  private badRequest(message: string) {
    return new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message,
    })
  }
}

type SchedulingRules = {
  minimumBookingLeadHours: number
  bookingWindowDays: number
  defaultAppointmentDurationMinutes: number
}

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

const INTERNAL_AVAILABILITY_SELECT = {
  id: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  priest: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.AvailabilitySelect

type InternalAvailability = Prisma.AvailabilityGetPayload<{ select: typeof INTERNAL_AVAILABILITY_SELECT }>

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['AGENDADO', 'PENDENTE_CONFIRMACAO']

function toInternalAvailability(availability: InternalAvailability) {
  return {
    id: availability.id,
    dayOfWeek: availability.dayOfWeek,
    startTime: timeOnly(availability.startTime),
    endTime: timeOnly(availability.endTime),
    active: availability.active,
    createdAt: availability.createdAt.toISOString(),
    updatedAt: availability.updatedAt.toISOString(),
    priest: availability.priest,
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

function validateDayOfWeek(value: number | undefined): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    throw new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message: 'Dia da semana invalido.',
    })
  }

  return parsed
}

function parseTime(value: string | undefined): Date {
  const normalized = String(value ?? '').trim()
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    throw new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message: 'Horario invalido.',
    })
  }

  const [hour, minute] = normalized.split(':').map(Number)
  if (hour > 23 || minute > 59) {
    throw new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message: 'Horario invalido.',
    })
  }

  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0))
}

function timeOnly(value: Date): string {
  return `${value.getUTCHours().toString().padStart(2, '0')}:${value
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}`
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = []
  for (let day = startOfDay(from); day <= to; day = addDays(day, 1)) {
    days.push(day)
  }
  return days
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
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
