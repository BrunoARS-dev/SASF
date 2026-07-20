import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { PUBLIC_APPOINTMENT_RATE_LIMIT } from './appointments.constants'
import { AppointmentsController } from './appointments.controller'
import { AppointmentsService } from './appointments.service'
import { PrivateCodeService } from './private-code.service'

@Module({
  imports: [
    AuthModule,
    AuditModule,
    ThrottlerModule.forRoot([
      {
        ttl: PUBLIC_APPOINTMENT_RATE_LIMIT.windowMs,
        limit: PUBLIC_APPOINTMENT_RATE_LIMIT.maxAttempts,
      },
    ]),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PrivateCodeService],
})
export class AppointmentsModule {}
