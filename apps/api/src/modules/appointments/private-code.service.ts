import { Injectable } from '@nestjs/common'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

@Injectable()
export class PrivateCodeService {
  generate(): string {
    return randomBytes(18).toString('base64url')
  }

  hash(code: string): string {
    return createHash('sha256').update(this.normalize(code)).digest('base64url')
  }

  matches(code: string, codeHash: string): boolean {
    const actual = Buffer.from(this.hash(code), 'base64url')
    const expected = Buffer.from(codeHash, 'base64url')

    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }

  private normalize(code: string): string {
    return code.trim()
  }
}
