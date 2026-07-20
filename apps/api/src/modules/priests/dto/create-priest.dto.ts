export class CreatePriestDto {
  readonly name?: string
  readonly username?: string
  readonly email?: string
  readonly password?: string
  readonly active?: boolean
  readonly appointmentDurationMin?: number
}
