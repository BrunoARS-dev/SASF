import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AvailabilityService } from './availability.service'
import {
  AvailableDaysQueryDto,
  AvailableTimesQueryDto,
} from './dto/availability-query.dto'
import { CreateAvailabilityDto } from './dto/create-availability.dto'
import { UpdateAvailabilityDto } from './dto/update-availability.dto'

@Controller()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('public/availability/days')
  listPublicDays(@Query() query: AvailableDaysQueryDto) {
    return this.availabilityService.listPublicDays(query)
  }

  @Get('public/availability/times')
  listPublicTimes(@Query() query: AvailableTimesQueryDto) {
    return this.availabilityService.listPublicTimes(query)
  }

  @Get('availabilities')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  listInternal(@Query() query: PaginationQueryDto) {
    return this.availabilityService.listInternal(query)
  }

  @Post('availabilities')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  create(@Body() dto: CreateAvailabilityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.create(dto, user)
  }

  @Patch('availabilities/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  update(@Param('id') id: string, @Body() dto: UpdateAvailabilityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.update(id, dto, user)
  }

  @Delete('availabilities/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.remove(id, user)
  }
}
