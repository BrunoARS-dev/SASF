import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AvailabilityController } from './availability.controller'
import { AvailabilityService } from './availability.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
