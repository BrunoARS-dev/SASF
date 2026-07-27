import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Permissions } from '../auth/decorators/permissions.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
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
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('availability.manage')
  listInternal(@Query() query: PaginationQueryDto) {
    return this.availabilityService.listInternal(query)
  }

  @Post('availabilities')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('availability.manage')
  create(@Body() dto: CreateAvailabilityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.create(dto, user)
  }

  @Patch('availabilities/:id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('availability.manage')
  update(@Param('id') id: string, @Body() dto: UpdateAvailabilityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.update(id, dto, user)
  }

  @Delete('availabilities/:id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('availability.manage')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.remove(id, user)
  }
}
