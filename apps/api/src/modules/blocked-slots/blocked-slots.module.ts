import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { BlockedSlotsController } from './blocked-slots.controller'
import { BlockedSlotsService } from './blocked-slots.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [BlockedSlotsController],
  providers: [BlockedSlotsService],
})
export class BlockedSlotsModule {}
