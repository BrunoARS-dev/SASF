import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { AppointmentStatus, PrismaClient } from '@prisma/client'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import {
  combineInstantDateAndTime,
  getDayOfWeekInTimeZone,
  localDateTimeToUtc,
} from '../../common/time-zone'
import { requireFields } from '../../common/validation/required-fields'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { AgendaDayQueryDto } from './dto/agenda-day-query.dto'
import { CreateManualAppointmentDto } from './dto/create-manual-appointment.dto'
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto'
import { LookupAppointmentDto } from './dto/lookup-appointment.dto'
import { RecoverCodeDto } from './dto/recover-code.dto'
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto'
import { PrivateCodeService } from './private-code.service'

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly privateCodeService: PrivateCodeService,
    private readonly auditService: AuditService,
  ) {}

  async createPublic(dto: CreatePublicAppointmentDto) {
    requireFields(dto as Record<string, unknown>, [
      'faithfulName',
      'faithfulPhone',
      'faithfulLastName',
      'startAt',
    ])

    const now = new Date()
    const rules = await this.getSchedulingRules()
    const startAt = parseDateTime(dto.startAt as string)
    const faithful = this.normalizeFaithful(dto)

    this.assertValidDate(startAt)
    this.assertBookingWindow(startAt, now, rules)

    return this.runSerializableTransaction(async (tx) => {
      await this.assertNoFutureActiveAppointment(tx, faithful.phone, faithful.lastName, now)

      const priestSlot = await this.findEligiblePriestSlot(tx, startAt, rules)
      if (!priestSlot) {
        throw this.badRequest('Horário indisponível.')
      }

      await this.assertSlotIsFree(tx, priestSlot.priestId, startAt, priestSlot.endAt)

      const code = this.privateCodeService.generate()
      const appointment = await tx.appointment.create({
        data: {
          priestId: priestSlot.priestId,
          startAt,
          endAt: priestSlot.endAt,
          faithfulName: faithful.name,
          faithfulPhone: faithful.phone,
          faithfulLastName: faithful.lastName,
          code: {
            create: {
              codeHash: this.privateCodeService.hash(code),
            },
          },
        },
        select: PUBLIC_APPOINTMENT_SELECT,
      })

      await this.auditService.recordSafeMutation(
        {
          action: 'APPOINTMENT_CREATED_PUBLIC',
          entityType: 'Appointment',
          entityId: appointment.id,
          metadataSafe: {
            source: 'public',
            status: appointment.status,
            startAt: appointment.startAt.toISOString(),
            endAt: appointment.endAt.toISOString(),
          },
        },
        tx,
      )

      return {
        code,
        appointment: this.toPublicAppointment(appointment),
        receiptAvailable: await this.getBooleanSetting('receipt_enabled', true),
      }
    })
  }

  async lookupByCode(dto: LookupAppointmentDto) {
    requireFields(dto as Record<string, unknown>, ['code'])

    const appointment = await this.findActiveAppointmentByCode(dto.code as string)

    if (!appointment) {
      throw this.notFound()
    }

    return { appointment: this.toPublicAppointment(appointment) }
  }

  async cancelByCode(code: string) {
    requireFields({ code }, ['code'])

    const appointment = await this.findActiveAppointmentByCode(code)

    if (!appointment) {
      throw this.notFound()
    }

    const rules = await this.getSchedulingRules()
    const minimumCancelAt = new Date(Date.now() + rules.minimumCancellationLeadHours * HOUR_MS)

    if (appointment.startAt < minimumCancelAt) {
      throw this.badRequest('Cancelamento público fora do prazo permitido.')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELADO',
          cancelledAt: new Date(),
        },
      })
      await tx.appointmentCode.updateMany({
        where: { appointmentId: appointment.id, active: true },
        data: {
          active: false,
          revokedAt: new Date(),
        },
      })
      await this.auditService.recordSafeMutation(
        {
          action: 'APPOINTMENT_CANCELLED_PUBLIC',
          entityType: 'Appointment',
          entityId: appointment.id,
          metadataSafe: {
            source: 'public',
            status: 'CANCELADO',
          },
        },
        tx,
      )
    })

    return { ok: true }
  }

  async recoverCode(dto: RecoverCodeDto) {
    requireFields(dto as Record<string, unknown>, [
      'faithfulPhone',
      'faithfulLastName',
      'date',
    ])

    const recoveryEnabled = await this.getBooleanSetting('code_recovery_enabled', true)
    const neutralResponse = {
      message: 'Se houver um agendamento compatível, as instruções serão disponibilizadas.',
    }

    if (!recoveryEnabled) {
      return neutralResponse
    }

    const date = parseDateOnly(dto.date as string)
    if (Number.isNaN(date.getTime())) {
      return neutralResponse
    }

    const phone = normalizePhone(dto.faithfulPhone as string)
    const lastName = normalizeName(dto.faithfulLastName as string)
    const startOfRequestedDay = startOfDay(date)
    const endOfRequestedDay = addDays(startOfRequestedDay, 1)

    const matches = await this.prisma.appointment.findMany({
      where: {
        faithfulPhone: phone,
        faithfulLastName: { equals: lastName, mode: 'insensitive' },
        startAt: { gte: startOfRequestedDay, lt: endOfRequestedDay },
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        deletedAt: null,
      },
      select: {
        id: true,
      },
      take: 2,
    })

    if (matches.length !== 1) {
      return neutralResponse
    }

    const code = this.privateCodeService.generate()
    await this.prisma.$transaction(async (tx) => {
      await tx.appointmentCode.updateMany({
        where: { appointmentId: matches[0].id, active: true },
        data: {
          active: false,
          revokedAt: new Date(),
        },
      })
      await tx.appointmentCode.upsert({
        where: { appointmentId: matches[0].id },
        update: {
          codeHash: this.privateCodeService.hash(code),
          active: true,
          revokedAt: null,
        },
        create: {
          appointmentId: matches[0].id,
          codeHash: this.privateCodeService.hash(code),
        },
      })
      await this.auditService.recordSafeMutation(
        {
          action: 'APPOINTMENT_CODE_RECOVERED',
          entityType: 'Appointment',
          entityId: matches[0].id,
          metadataSafe: {
            source: 'public',
            matched: true,
          },
        },
        tx,
      )
    })

    return {
      ...neutralResponse,
      code,
    }
  }

  async listDay(query: AgendaDayQueryDto, actor?: AuthenticatedUser) {
    requireFields(query as Record<string, unknown>, ['date'])
    await this.markExpiredAppointmentsPending()

    const date = parseDateOnly(query.date as string)
    this.assertValidDate(date)

    const page = boundedPositiveInt(query.page, 1, 1, 500)
    const limit = boundedPositiveInt(query.limit, 30, 1, 100)
    const startAt = startOfDay(date)
    const endAt = addDays(startAt, 1)
    const priestScope = await this.getPriestScopeForActor(actor)
    const where: Prisma.AppointmentWhereInput = {
      startAt: { gte: startAt, lt: endAt },
      deletedAt: null,
      ...(priestScope ? { priestId: priestScope } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: INTERNAL_APPOINTMENT_SELECT,
      }),
      this.prisma.appointment.count({
        where,
      }),
    ])

    return {
      items: items.map((appointment) => this.toInternalAppointment(appointment)),
      page,
      limit,
      total,
    }
  }

  async createManual(dto: CreateManualAppointmentDto, actor?: AuthenticatedUser) {
    requireFields(dto as Record<string, unknown>, [
      'faithfulName',
      'faithfulPhone',
      'faithfulLastName',
      'startAt',
    ])

    const manualOverrideEnabled = await this.getBooleanSetting('manual_override_enabled', true)
    if (!manualOverrideEnabled) {
      throw this.badRequest('Encaixe manual desabilitado.')
    }

    const now = new Date()
    const rules = await this.getSchedulingRules()
    const startAt = parseDateTime(dto.startAt as string)
    const faithful = this.normalizeFaithful(dto)

    this.assertValidDate(startAt)

    return this.runSerializableTransaction(async (tx) => {
      await this.assertNoFutureActiveAppointment(tx, faithful.phone, faithful.lastName, now)

      const priestSlot = dto.priestId
        ? await this.findSpecificManualPriestSlot(tx, dto.priestId, startAt, rules)
        : await this.findEligibleManualPriestSlot(tx, startAt, rules)

      if (!priestSlot) {
        throw this.badRequest('Horário indisponível.')
      }

      await this.assertSlotIsFree(tx, priestSlot.priestId, startAt, priestSlot.endAt)

      const code = this.privateCodeService.generate()
      const appointment = await tx.appointment.create({
        data: {
          priestId: priestSlot.priestId,
          startAt,
          endAt: priestSlot.endAt,
          faithfulName: faithful.name,
          faithfulPhone: faithful.phone,
          faithfulLastName: faithful.lastName,
          code: {
            create: {
              codeHash: this.privateCodeService.hash(code),
            },
          },
        },
        select: INTERNAL_APPOINTMENT_SELECT,
      })

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'APPOINTMENT_CREATED_MANUAL',
          entityType: 'Appointment',
          entityId: appointment.id,
          metadataSafe: {
            source: 'internal',
            status: appointment.status,
            startAt: appointment.startAt.toISOString(),
            endAt: appointment.endAt.toISOString(),
            priestId: appointment.priest.id,
          },
        },
        tx,
      )

      return {
        code,
        appointment: this.toInternalAppointment(appointment),
      }
    })
  }

  async cancelInternal(id: string, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        deletedAt: null,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
      },
      select: { id: true },
    })

    if (!appointment) {
      throw this.notFound()
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: {
          status: 'CANCELADO',
          cancelledAt: new Date(),
        },
      })
      await tx.appointmentCode.updateMany({
        where: { appointmentId: id, active: true },
        data: {
          active: false,
          revokedAt: new Date(),
        },
      })
      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'APPOINTMENT_CANCELLED_INTERNAL',
          entityType: 'Appointment',
          entityId: id,
          metadataSafe: {
            source: 'internal',
            status: 'CANCELADO',
          },
        },
        tx,
      )
    })

    return { ok: true }
  }

  async deleteCancelled(id: string, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        deletedAt: null,
        status: 'CANCELADO',
      },
      select: { id: true },
    })

    if (!appointment) {
      throw this.notFound()
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      })
      await tx.appointmentCode.updateMany({
        where: { appointmentId: id, active: true },
        data: {
          active: false,
          revokedAt: new Date(),
        },
      })
      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'APPOINTMENT_DELETED_CANCELLED',
          entityType: 'Appointment',
          entityId: id,
          metadataSafe: {
            source: 'internal',
            status: 'CANCELADO',
          },
        },
        tx,
      )
    })

    return { ok: true }
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto, actor?: AuthenticatedUser) {
    requireFields({ id, ...dto }, ['id', 'startAt'])

    const rules = await this.getSchedulingRules()
    const startAt = parseDateTime(dto.startAt as string)
    this.assertValidDate(startAt)
    if (startAt <= new Date()) {
      throw this.badRequest('Novo horario deve ser futuro.')
    }

    return this.runSerializableTransaction(async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: {
          id,
          deletedAt: null,
          status: { in: ACTIVE_APPOINTMENT_STATUSES },
        },
        select: {
          id: true,
          priestId: true,
          startAt: true,
          faithfulPhone: true,
          faithfulLastName: true,
        },
      })

      if (!existing) {
        throw this.notFound()
      }

      if (existing.startAt <= new Date()) {
        throw this.badRequest('Agendamento passado nao pode ser editado.')
      }

      const priestSlot = await this.findSpecificManualPriestSlot(tx, existing.priestId, startAt, rules)
      if (!priestSlot) {
        throw this.badRequest('Horário indisponível.')
      }

      await this.assertSlotIsFree(tx, existing.priestId, startAt, priestSlot.endAt, existing.id)

      const appointment = await tx.appointment.update({
        where: { id },
        data: {
          startAt,
          endAt: priestSlot.endAt,
          status: 'AGENDADO',
          cancelledAt: null,
          completedAt: null,
        },
        select: INTERNAL_APPOINTMENT_SELECT,
      })

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'APPOINTMENT_RESCHEDULED',
          entityType: 'Appointment',
          entityId: appointment.id,
          metadataSafe: {
            source: 'internal',
            status: appointment.status,
            startAt: appointment.startAt.toISOString(),
            endAt: appointment.endAt.toISOString(),
            priestId: appointment.priest.id,
          },
        },
        tx,
      )

      return { appointment: this.toInternalAppointment(appointment) }
    })
  }

  async markRealized(id: string, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    return this.markAttendance(id, 'REALIZADO', actor)
  }

  async markAbsent(id: string, actor?: AuthenticatedUser) {
    requireFields({ id }, ['id'])
    return this.markAttendance(id, 'AUSENTE', actor)
  }

  async markExpiredAppointmentsPending() {
    await this.prisma.appointment.updateMany({
      where: {
        status: 'AGENDADO',
        endAt: { lt: new Date() },
        deletedAt: null,
      },
      data: { status: 'PENDENTE_CONFIRMACAO' },
    })
  }

  private async markAttendance(
    id: string,
    status: 'REALIZADO' | 'AUSENTE',
    actor?: AuthenticatedUser,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        deletedAt: null,
        status: { in: ['AGENDADO', 'PENDENTE_CONFIRMACAO'] },
        ...(actor?.role === 'PADRE' ? { priest: { userId: actor.id } } : {}),
      },
      select: { id: true },
    })

    if (!appointment) {
      throw this.notFound()
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.update({
        where: { id },
        data: {
          status,
          completedAt: status === 'REALIZADO' ? new Date() : null,
        },
        select: INTERNAL_APPOINTMENT_SELECT,
      })

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: status === 'REALIZADO' ? 'APPOINTMENT_REALIZED' : 'APPOINTMENT_ABSENT',
          entityType: 'Appointment',
          entityId: id,
          metadataSafe: {
            source: 'internal',
            status,
            priestId: appointment.priest.id,
          },
        },
        tx,
      )

      return appointment
    })

    return { appointment: this.toInternalAppointment(updated) }
  }

  private async getPriestScopeForActor(actor?: AuthenticatedUser): Promise<string | null> {
    if (actor?.role !== 'PADRE') {
      return null
    }

    const priest = await this.prisma.priest.findFirst({
      where: {
        userId: actor.id,
        active: true,
        deletedAt: null,
      },
      select: { id: true },
    })

    return priest?.id ?? '__no_priest_profile__'
  }

  private async findActiveAppointmentByCode(code: string) {
    const codeHash = this.privateCodeService.hash(code)
    const appointmentCode = await this.prisma.appointmentCode.findUnique({
      where: { codeHash },
      select: {
        active: true,
        appointment: {
          select: PUBLIC_APPOINTMENT_SELECT,
        },
      },
    })

    if (
      !appointmentCode?.active ||
      appointmentCode.appointment.deletedAt ||
      !ACTIVE_APPOINTMENT_STATUSES.includes(appointmentCode.appointment.status)
    ) {
      return null
    }

    return appointmentCode.appointment
  }

  private async assertNoFutureActiveAppointment(
    tx: TransactionClient,
    faithfulPhone: string,
    faithfulLastName: string,
    now: Date,
  ) {
    const existing = await tx.appointment.findFirst({
      where: {
        faithfulPhone,
        faithfulLastName: { equals: faithfulLastName, mode: 'insensitive' },
        startAt: { gt: now },
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        deletedAt: null,
      },
      select: { id: true },
    })

    if (existing) {
      throw this.badRequest('Já existe um agendamento futuro ativo para este fiel.')
    }
  }

  private async findEligiblePriestSlot(
    tx: TransactionClient,
    startAt: Date,
    rules: SchedulingRules,
  ): Promise<PriestSlot | null> {
    const dayOfWeek = getDayOfWeekInTimeZone(startAt)
    const availabilities = await tx.availability.findMany({
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
      orderBy: [{ priestId: 'asc' }, { startTime: 'asc' }],
      select: AVAILABILITY_SLOT_SELECT,
    })

    for (const availability of availabilities) {
      const slot = this.slotFromAvailability(availability, startAt, rules)
      if (!slot) continue

      const free = await this.isSlotFree(tx, slot.priestId, slot.startAt, slot.endAt)
      if (free) {
        return slot
      }
    }

    return null
  }

  private async findSpecificPriestSlot(
    tx: TransactionClient,
    priestId: string,
    startAt: Date,
    rules: SchedulingRules,
  ): Promise<PriestSlot | null> {
    const availabilities = await tx.availability.findMany({
      where: {
        priestId,
        dayOfWeek: getDayOfWeekInTimeZone(startAt),
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
      orderBy: { startTime: 'asc' },
      select: AVAILABILITY_SLOT_SELECT,
    })

    for (const availability of availabilities) {
      const slot = this.slotFromAvailability(availability, startAt, rules)
      if (slot) {
        return slot
      }
    }

    return null
  }

  private async findSpecificManualPriestSlot(
    tx: TransactionClient,
    priestId: string,
    startAt: Date,
    rules: SchedulingRules,
  ): Promise<PriestSlot | null> {
    const priest = await tx.priest.findFirst({
      where: {
        id: priestId,
        active: true,
        deletedAt: null,
        user: {
          active: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        appointmentDurationMin: true,
      },
    })

    if (!priest) {
      return null
    }

    return this.manualSlotForPriest(priest, startAt, rules)
  }

  private async findEligibleManualPriestSlot(
    tx: TransactionClient,
    startAt: Date,
    rules: SchedulingRules,
  ): Promise<PriestSlot | null> {
    const priests = await tx.priest.findMany({
      where: {
        active: true,
        deletedAt: null,
        user: {
          active: true,
          deletedAt: null,
        },
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        appointmentDurationMin: true,
      },
    })

    for (const priest of priests) {
      const slot = this.manualSlotForPriest(priest, startAt, rules)
      const free = await this.isSlotFree(tx, slot.priestId, slot.startAt, slot.endAt)
      if (free) {
        return slot
      }
    }

    return null
  }

  private manualSlotForPriest(
    priest: { id: string; appointmentDurationMin: number | null },
    startAt: Date,
    rules: SchedulingRules,
  ): PriestSlot {
    const durationMinutes = priest.appointmentDurationMin ?? rules.defaultAppointmentDurationMinutes

    return {
      priestId: priest.id,
      startAt,
      endAt: addMinutes(startAt, durationMinutes),
    }
  }

  private slotFromAvailability(
    availability: AvailabilitySlot,
    startAt: Date,
    rules: SchedulingRules,
  ): PriestSlot | null {
    const durationMinutes = availability.priest.appointmentDurationMin ?? rules.defaultAppointmentDurationMinutes
    const availabilityStart = combineInstantDateAndTime(startAt, availability.startTime)
    const availabilityEnd = combineInstantDateAndTime(startAt, availability.endTime)
    const endAt = addMinutes(startAt, durationMinutes)

    if (startAt < availabilityStart || endAt > availabilityEnd) {
      return null
    }

    const offsetMs = startAt.getTime() - availabilityStart.getTime()
    if (offsetMs % (durationMinutes * MINUTE_MS) !== 0) {
      return null
    }

    return {
      priestId: availability.priest.id,
      startAt,
      endAt,
    }
  }

  private async assertSlotIsFree(
    tx: TransactionClient,
    priestId: string,
    startAt: Date,
    endAt: Date,
    exceptAppointmentId?: string,
  ) {
    const free = await this.isSlotFree(tx, priestId, startAt, endAt, exceptAppointmentId)
    if (!free) {
      throw this.badRequest('Horário indisponível.')
    }
  }

  private async isSlotFree(
    tx: TransactionClient,
    priestId: string,
    startAt: Date,
    endAt: Date,
    exceptAppointmentId?: string,
  ): Promise<boolean> {
    const [conflictingAppointment, conflictingBlock] = await Promise.all([
      tx.appointment.findFirst({
        where: {
          id: exceptAppointmentId ? { not: exceptAppointmentId } : undefined,
          priestId,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
          status: { in: ACTIVE_APPOINTMENT_STATUSES },
          deletedAt: null,
        },
        select: { id: true },
      }),
      tx.blockedSlot.findFirst({
        where: {
          priestId,
          active: true,
          deletedAt: null,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      }),
    ])

    return !conflictingAppointment && !conflictingBlock
  }

  private assertBookingWindow(startAt: Date, now: Date, rules: SchedulingRules) {
    const earliest = new Date(now.getTime() + rules.minimumBookingLeadHours * HOUR_MS)
    const latest = addDays(now, rules.bookingWindowDays)

    if (startAt < earliest || startAt > latest) {
      throw this.badRequest('Horário fora da janela permitida.')
    }
  }

  private async getSchedulingRules(): Promise<SchedulingRules> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'minimum_booking_lead_hours',
            'minimum_cancellation_lead_hours',
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
      minimumCancellationLeadHours: value('minimum_cancellation_lead_hours', 24),
      bookingWindowDays: value('booking_window_days', 30),
      defaultAppointmentDurationMinutes: value('default_appointment_duration_minutes', 30),
    }
  }

  private async getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    })

    if (!setting) {
      return fallback
    }

    return setting.value === 'true'
  }

  private normalizeFaithful(dto: {
    faithfulName?: string
    faithfulPhone?: string
    faithfulLastName?: string
  }) {
    return {
      name: normalizeName(dto.faithfulName as string),
      phone: normalizePhone(dto.faithfulPhone as string),
      lastName: normalizeName(dto.faithfulLastName as string),
    }
  }

  private toPublicAppointment(appointment: PublicAppointment) {
    return {
      id: appointment.id,
      sequenceNumber: appointment.sequenceNumber,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status,
      faithfulName: appointment.faithfulName,
      faithfulLastName: appointment.faithfulLastName,
    }
  }

  private toInternalAppointment(appointment: InternalAppointment) {
    return {
      id: appointment.id,
      sequenceNumber: appointment.sequenceNumber,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status,
      faithfulName: appointment.faithfulName,
      faithfulPhone: appointment.faithfulPhone,
      faithfulLastName: appointment.faithfulLastName,
      priest: {
        id: appointment.priest.id,
        name: appointment.priest.name,
      },
      cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
      completedAt: appointment.completedAt?.toISOString() ?? null,
    }
  }

  private assertValidDate(date: Date) {
    if (Number.isNaN(date.getTime())) {
      throw this.badRequest('Data inválida.')
    }
  }

  private badRequest(message: string) {
    return new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message,
    })
  }

  private notFound() {
    return new NotFoundException({
      code: AppErrorCodes.NOT_FOUND,
      message: 'Agendamento não encontrado.',
    })
  }

  private async runSerializableTransaction<T>(
    action: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(action, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (isPrismaConcurrencyError(error)) {
        throw this.badRequest('Horário indisponível.')
      }

      throw error
    }
  }
}

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

type SchedulingRules = {
  minimumBookingLeadHours: number
  minimumCancellationLeadHours: number
  bookingWindowDays: number
  defaultAppointmentDurationMinutes: number
}

type PriestSlot = {
  priestId: string
  startAt: Date
  endAt: Date
}

const PUBLIC_APPOINTMENT_SELECT = {
  id: true,
  sequenceNumber: true,
  startAt: true,
  endAt: true,
  status: true,
  faithfulName: true,
  faithfulLastName: true,
  deletedAt: true,
} satisfies Prisma.AppointmentSelect

const INTERNAL_APPOINTMENT_SELECT = {
  id: true,
  sequenceNumber: true,
  startAt: true,
  endAt: true,
  status: true,
  faithfulName: true,
  faithfulPhone: true,
  faithfulLastName: true,
  cancelledAt: true,
  completedAt: true,
  priest: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.AppointmentSelect

const AVAILABILITY_SLOT_SELECT = {
  startTime: true,
  endTime: true,
  priest: {
    select: {
      id: true,
      appointmentDurationMin: true,
    },
  },
} satisfies Prisma.AvailabilitySelect

type PublicAppointment = Prisma.AppointmentGetPayload<{ select: typeof PUBLIC_APPOINTMENT_SELECT }>
type InternalAppointment = Prisma.AppointmentGetPayload<{ select: typeof INTERNAL_APPOINTMENT_SELECT }>
type AvailabilitySlot = Prisma.AvailabilityGetPayload<{ select: typeof AVAILABILITY_SLOT_SELECT }>

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['AGENDADO', 'PENDENTE_CONFIRMACAO']

function parseDateTime(value: string): Date {
  return localDateTimeToUtc(value)
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
  return new Date(date.getTime() + minutes * MINUTE_MS)
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
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

function isPrismaConcurrencyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false
  }

  const code = (error as { code?: unknown }).code
  return code === 'P2002' || code === 'P2034'
}
