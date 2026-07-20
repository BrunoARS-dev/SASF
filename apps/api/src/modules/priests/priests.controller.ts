import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CreatePriestDto } from './dto/create-priest.dto'
import { UpdatePriestDto } from './dto/update-priest.dto'
import { PriestsService } from './priests.service'

@Controller('priests')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'SECRETARIA')
export class PriestsController {
  constructor(private readonly priestsService: PriestsService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.priestsService.list(query)
  }

  @Post()
  create(@Body() dto: CreatePriestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.priestsService.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePriestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.priestsService.update(id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.priestsService.remove(id, user)
  }
}
