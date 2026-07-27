import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { Permissions } from '../auth/decorators/permissions.decorator'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { AuditService } from './audit.service'

@Controller('audit-logs')
@UseGuards(AuthGuard, PermissionsGuard)
@Permissions('audit.view')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.auditService.list(query)
  }
}
