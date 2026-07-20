import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AppErrorCodes } from '../../common/errors/app-error-codes'
import { requireFields } from '../../common/validation/required-fields'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateSettingDto } from './dto/update-setting.dto'

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
      select: {
        key: true,
        value: true,
        valueType: true,
        description: true,
        updatedAt: true,
      },
    })

    return {
      items: settings.map((setting) => ({
        ...setting,
        updatedAt: setting.updatedAt.toISOString(),
      })),
    }
  }

  async update(dto: UpdateSettingDto, actor?: AuthenticatedUser) {
    requireFields(dto as Record<string, unknown>, ['key', 'value'])

    const key = String(dto.key).trim()
    const value = String(dto.value).trim()

    if (!key || !value) {
      throw new BadRequestException({
        code: AppErrorCodes.BAD_REQUEST,
        message: 'Configuracao invalida.',
      })
    }

    const existing = await this.prisma.systemSetting.findUnique({
      where: { key },
      select: { key: true, valueType: true },
    })

    if (!existing) {
      throw new NotFoundException({
        code: AppErrorCodes.NOT_FOUND,
        message: 'Configuracao nao encontrada.',
      })
    }

    validateSettingValue(value, existing.valueType)

    const setting = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.systemSetting.update({
        where: { key },
        data: {
          value,
          updatedById: actor?.id,
        },
        select: {
          key: true,
          value: true,
          valueType: true,
          description: true,
          updatedAt: true,
        },
      })

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'SETTING_UPDATED',
          entityType: 'SystemSetting',
          entityId: key,
          metadataSafe: {
            key,
            valueType: existing.valueType,
          },
        },
        tx,
      )

      return updated
    })

    return {
      setting: {
        ...setting,
        updatedAt: setting.updatedAt.toISOString(),
      },
    }
  }

  async getCurrentPublicQrCode() {
    const qrCode = await this.prisma.qrCode.findFirst({
      where: { active: true },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        publicPath: true,
        version: true,
        active: true,
        generatedAt: true,
      },
    })

    if (!qrCode) {
      return { qrCode: null }
    }

    return { qrCode: this.toQrCodeResponse(qrCode) }
  }

  async generatePublicQrCode(actor?: AuthenticatedUser) {
    const publicPath = '/agendar'
    const qrCode = await this.prisma.$transaction(async (tx) => {
      const current = await tx.qrCode.findFirst({
        orderBy: { version: 'desc' },
        select: { version: true },
      })
      const version = (current?.version ?? 0) + 1

      await tx.qrCode.updateMany({
        where: { active: true },
        data: {
          active: false,
          revokedAt: new Date(),
        },
      })

      const created = await tx.qrCode.create({
        data: {
          publicPath,
          version,
          generatedById: actor?.id,
        },
        select: {
          id: true,
          publicPath: true,
          version: true,
          active: true,
          generatedAt: true,
        },
      })

      await this.auditService.recordSafeMutation(
        {
          actorUserId: actor?.id,
          action: 'QR_CODE_GENERATED',
          entityType: 'QrCode',
          entityId: created.id,
          metadataSafe: {
            publicPath,
            version,
            active: created.active,
          },
        },
        tx,
      )

      return created
    })

    return {
      qrCode: this.toQrCodeResponse(qrCode),
    }
  }

  private toQrCodeResponse(qrCode: {
    id: string
    publicPath: string
    version: number
    active: boolean
    generatedAt: Date
  }) {
    const publicBaseUrl = process.env.PUBLIC_APP_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000'

    return {
      ...qrCode,
      generatedAt: qrCode.generatedAt.toISOString(),
      url: `${publicBaseUrl.replace(/\/$/, '')}${qrCode.publicPath}`,
    }
  }
}

function validateSettingValue(value: string, valueType: 'STRING' | 'INTEGER' | 'BOOLEAN') {
  if (valueType === 'INTEGER') {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException({
        code: AppErrorCodes.BAD_REQUEST,
        message: 'Valor numerico invalido.',
      })
    }
  }

  if (valueType === 'BOOLEAN' && value !== 'true' && value !== 'false') {
    throw new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message: 'Valor booleano invalido.',
    })
  }
}
