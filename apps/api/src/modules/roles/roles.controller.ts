import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Permissions } from '../auth/decorators/permissions.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto'
import { RolesService } from './roles.service'

@Controller('roles')
@UseGuards(AuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('user.manage')
  list() {
    return this.rolesService.list()
  }

  @Patch(':key/permissions')
  @Permissions('role.manage')
  updatePermissions(
    @Param('key') key: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.updatePermissions(key, dto, user)
  }
}
