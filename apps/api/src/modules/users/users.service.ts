import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { User, UserRole } from '@prisma/client'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import { requireFields } from '../../common/validation/required-fields'
import { PasswordService } from '../auth/password.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { ResetUserPasswordDto } from './dto/reset-user-password.dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(_query: PaginationQueryDto) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return users.map((user) => this.toPublicUser(user))
  }

  async create(dto: CreateUserDto) {
    requireFields(dto as Record<string, unknown>, [
      'name',
      'username',
      'email',
      'password',
      'role',
    ])

    const role = this.validateRole(dto.role)
    const passwordHash = await this.passwordService.hash(dto.password as string)

    const user = await this.prisma.user.create({
      data: {
        name: String(dto.name).trim(),
        username: this.normalizeUsername(dto.username),
        email: this.normalizeEmail(dto.email),
        passwordHash,
        role,
        active: dto.active ?? true,
      },
    })

    return this.toPublicUser(user)
  }

  async resetPassword(id: string, dto: ResetUserPasswordDto) {
    requireFields({ id, ...dto }, ['id', 'password'])

    const existingUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    })

    if (!existingUser) {
      throw new NotFoundException({
        code: AppErrorCodes.NOT_FOUND,
        message: 'Usuário não encontrado.',
      })
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await this.passwordService.hash(dto.password as string),
      },
    })

    return this.toPublicUser(user)
  }

  private validateRole(role: CreateUserDto['role']): UserRole {
    if (role === 'ADMIN' || role === 'SECRETARIA' || role === 'PADRE') {
      return role
    }

    throw new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message: 'Papel inválido.',
    })
  }

  private normalizeUsername(username: string | undefined): string {
    return String(username ?? '').trim().toLowerCase()
  }

  private normalizeEmail(email: string | undefined): string {
    return String(email ?? '').trim().toLowerCase()
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
