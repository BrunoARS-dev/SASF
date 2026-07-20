export const PUBLIC_APPOINTMENT_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxAttempts: 10,
} as const

export const PUBLIC_CODE_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxAttempts: 20,
} as const
