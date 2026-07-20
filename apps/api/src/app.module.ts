import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { PriestsModule } from './modules/priests/priests.module'
import { AvailabilityModule } from './modules/availability/availability.module'
import { BlockedSlotsModule } from './modules/blocked-slots/blocked-slots.module'
import { AppointmentsModule } from './modules/appointments/appointments.module'
import { SettingsModule } from './modules/settings/settings.module'
import { AuditModule } from './modules/audit/audit.module'
import { PrismaModule } from './modules/prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    PriestsModule,
    AvailabilityModule,
    BlockedSlotsModule,
    AppointmentsModule,
    SettingsModule,
  ],
})
export class AppModule {}
