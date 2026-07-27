export class UpdatePriestDto {
  readonly name?: string
  readonly userId?: string | null
  readonly active?: boolean
  readonly appointmentDurationMin?: number
}
