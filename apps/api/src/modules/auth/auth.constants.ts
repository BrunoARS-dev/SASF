export const AUTH_SESSION_COOKIE = 'sasf_session'
export const AUTH_SESSION_TTL_SECONDS = 8 * 60 * 60
export const AUTH_SESSION_TTL_MS = AUTH_SESSION_TTL_SECONDS * 1000
export const AUTH_LOGIN_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxAttempts: 5,
} as const
