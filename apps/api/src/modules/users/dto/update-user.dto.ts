export class UpdateUserDto {
  readonly name?: string
  readonly username?: string
  readonly email?: string
  readonly role?: 'ADMIN' | 'SECRETARIA' | 'PADRE'
  readonly active?: boolean
}
