import { BadRequestException } from '@nestjs/common'
import { AppErrorCodes } from '../errors/app-error-codes'

export function requireFields(
  input: Record<string, unknown>,
  fields: string[],
): void {
  const missing = fields.filter((field) => {
    const value = input[field]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    throw new BadRequestException({
      code: AppErrorCodes.BAD_REQUEST,
      message: 'Campos obrigatórios ausentes.',
    })
  }
}
