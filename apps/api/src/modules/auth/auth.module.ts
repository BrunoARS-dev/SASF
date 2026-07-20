import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AUTH_LOGIN_RATE_LIMIT } from './auth.constants'
import { AuthGuard } from './guards/auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { PasswordService } from './password.service'

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: AUTH_LOGIN_RATE_LIMIT.windowMs,
        limit: AUTH_LOGIN_RATE_LIMIT.maxAttempts,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, AuthGuard, RolesGuard],
  exports: [AuthService, PasswordService, AuthGuard, RolesGuard],
})
export class AuthModule {}
