import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Permissions } from '../auth/decorators/permissions.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { CreatePriestDto } from './dto/create-priest.dto'
import { UpdatePriestDto } from './dto/update-priest.dto'
import { PriestsService } from './priests.service'

@Controller('priests')
@UseGuards(AuthGuard, PermissionsGuard)
export class PriestsController {
  constructor(private readonly priestsService: PriestsService) {}

  @Get()
  @Permissions('priest.view')
  list(@Query() query: PaginationQueryDto) {
    return this.priestsService.list(query)
  }

  @Get('unlinked-users')
  @Permissions('priest.manage')
  listUnlinkedUsers() {
    return this.priestsService.listUnlinkedUsers()
  }

  @Post()
  @Permissions('priest.manage')
  create(@Body() dto: CreatePriestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.priestsService.create(dto, user)
  }

  @Patch(':id')
  @Permissions('priest.manage')
  update(@Param('id') id: string, @Body() dto: UpdatePriestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.priestsService.update(id, dto, user)
  }

  @Delete(':id')
  @Permissions('priest.delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.priestsService.remove(id, user)
  }
}
