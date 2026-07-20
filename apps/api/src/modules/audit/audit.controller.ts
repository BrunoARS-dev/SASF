import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AuditService } from './audit.service'

@Controller('audit-logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.auditService.list(query)
  }
}
