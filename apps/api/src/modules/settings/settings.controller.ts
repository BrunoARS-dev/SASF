import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { SettingsService } from './settings.service'
import { UpdateSettingDto } from './dto/update-setting.dto'

@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'SECRETARIA')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings')
  list() {
    return this.settingsService.list()
  }

  @Patch('settings')
  update(@Body() dto: UpdateSettingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.update(dto, user)
  }

  @Get('qr-codes/current')
  getCurrentPublicQrCode() {
    return this.settingsService.getCurrentPublicQrCode()
  }

  @Post('qr-codes')
  generatePublicQrCode(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.generatePublicQrCode(user)
  }
}
