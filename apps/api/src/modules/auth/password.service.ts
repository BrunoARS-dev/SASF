import { Injectable } from '@nestjs/common'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SCRYPT_COST = 16384
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 1

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url')
    const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    })

    return [
      'scrypt',
      SCRYPT_COST,
      SCRYPT_BLOCK_SIZE,
      SCRYPT_PARALLELIZATION,
      salt,
      derivedKey.toString('base64url'),
    ].join('$')
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, cost, blockSize, parallelization, salt, hash] =
      passwordHash.split('$')

    if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelization || !salt || !hash) {
      return false
    }

    try {
      const expected = Buffer.from(hash, 'base64url')
      const actual = await scrypt(password, salt, expected.length, {
        N: Number(cost),
        r: Number(blockSize),
        p: Number(parallelization),
      })

      return actual.length === expected.length && timingSafeEqual(actual, expected)
    } catch {
      return false
    }
  }
}

function scrypt(
  password: string,
  salt: string,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(derivedKey)
    })
  })
}
