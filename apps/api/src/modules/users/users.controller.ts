import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CreateUserDto } from './dto/create-user.dto'
import { ResetUserPasswordDto } from './dto/reset-user-password.dto'
import { UsersService } from './users.service'

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.usersService.list(query)
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto)
  }

  @Patch(':id/password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetUserPasswordDto) {
    return this.usersService.resetPassword(id, dto)
  }
}
