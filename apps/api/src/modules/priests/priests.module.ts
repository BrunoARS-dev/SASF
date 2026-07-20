import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { PriestsController } from './priests.controller'
import { PriestsService } from './priests.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PriestsController],
  providers: [PriestsService],
})
export class PriestsModule {}
