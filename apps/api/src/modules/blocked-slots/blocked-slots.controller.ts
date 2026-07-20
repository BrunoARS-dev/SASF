import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { BlockedSlotsService } from './blocked-slots.service'
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto'
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto'

@Controller('blocked-slots')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'SECRETARIA')
export class BlockedSlotsController {
  constructor(private readonly blockedSlotsService: BlockedSlotsService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.blockedSlotsService.list(query)
  }

  @Post()
  create(@Body() dto: CreateBlockedSlotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.blockedSlotsService.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlockedSlotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.blockedSlotsService.update(id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.blockedSlotsService.remove(id, user)
  }
}
