import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Permissions } from '../auth/decorators/permissions.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { SettingsService } from './settings.service'
import { UpdateSettingDto } from './dto/update-setting.dto'

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings')
  @Permissions('settings.manage')
  list() {
    return this.settingsService.list()
  }

  @Patch('settings')
  @Permissions('settings.manage')
  update(@Body() dto: UpdateSettingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.update(dto, user)
  }

  @Get('qr-codes/current')
  @Permissions('qrcode.manage')
  getCurrentPublicQrCode() {
    return this.settingsService.getCurrentPublicQrCode()
  }

  @Post('qr-codes')
  @Permissions('qrcode.manage')
  generatePublicQrCode(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.generatePublicQrCode(user)
  }
}
