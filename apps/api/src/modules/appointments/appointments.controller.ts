import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { PUBLIC_APPOINTMENT_RATE_LIMIT, PUBLIC_CODE_RATE_LIMIT } from './appointments.constants'
import { AgendaDayQueryDto } from './dto/agenda-day-query.dto'
import { CreateManualAppointmentDto } from './dto/create-manual-appointment.dto'
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto'
import { LookupAppointmentDto } from './dto/lookup-appointment.dto'
import { RecoverCodeDto } from './dto/recover-code.dto'
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto'
import { AppointmentsService } from './appointments.service'

@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('public/appointments')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: PUBLIC_APPOINTMENT_RATE_LIMIT.maxAttempts, ttl: PUBLIC_APPOINTMENT_RATE_LIMIT.windowMs } })
  createPublic(@Body() dto: CreatePublicAppointmentDto) {
    return this.appointmentsService.createPublic(dto)
  }

  @Post('public/appointments/lookup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: PUBLIC_CODE_RATE_LIMIT.maxAttempts, ttl: PUBLIC_CODE_RATE_LIMIT.windowMs } })
  lookupByCode(@Body() dto: LookupAppointmentDto) {
    return this.appointmentsService.lookupByCode(dto)
  }

  @Delete('public/appointments/:code')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: PUBLIC_CODE_RATE_LIMIT.maxAttempts, ttl: PUBLIC_CODE_RATE_LIMIT.windowMs } })
  cancelByCode(@Param('code') code: string) {
    return this.appointmentsService.cancelByCode(code)
  }

  @Post('public/code-recovery')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: PUBLIC_CODE_RATE_LIMIT.maxAttempts, ttl: PUBLIC_CODE_RATE_LIMIT.windowMs } })
  recoverCode(@Body() dto: RecoverCodeDto) {
    return this.appointmentsService.recoverCode(dto)
  }

  @Get('appointments/day')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA', 'PADRE')
  listDay(@Query() query: AgendaDayQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.listDay(query, user)
  }

  @Post('appointments/manual')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  createManual(@Body() dto: CreateManualAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.createManual(dto, user)
  }

  @Patch('appointments/:id/cancel')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  cancelInternal(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.cancelInternal(id, user)
  }

  @Delete('appointments/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  deleteCancelled(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.deleteCancelled(id, user)
  }

  @Patch('appointments/:id/reschedule')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  reschedule(@Param('id') id: string, @Body() dto: RescheduleAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.reschedule(id, dto, user)
  }

  @Patch('appointments/:id/attendance/realized')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA', 'PADRE')
  markRealized(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.markRealized(id, user)
  }

  @Patch('appointments/:id/attendance/absent')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA', 'PADRE')
  markAbsent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.markAbsent(id, user)
  }
}
