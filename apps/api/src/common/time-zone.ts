const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'

export const APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? DEFAULT_TIME_ZONE

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function getCalendarDayOfWeek(dateOnly: Date) {
  return new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate())).getUTCDay()
}

export function getDayOfWeekInTimeZone(date: Date, timeZone = APP_TIME_ZONE) {
  const parts = getPartsInTimeZone(date, timeZone)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
}

export function getLocalDayBounds(dateOnly: Date, timeZone = APP_TIME_ZONE) {
  const start = zonedDateTimeToUtc(
    {
      year: dateOnly.getUTCFullYear(),
      month: dateOnly.getUTCMonth() + 1,
      day: dateOnly.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone,
  )

  const nextDate = new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate() + 1))
  const end = zonedDateTimeToUtc(
    {
      year: nextDate.getUTCFullYear(),
      month: nextDate.getUTCMonth() + 1,
      day: nextDate.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone,
  )

  return { start, end }
}

export function combineDateOnlyAndTime(dateOnly: Date, time: Date, timeZone = APP_TIME_ZONE) {
  return zonedDateTimeToUtc(
    {
      year: dateOnly.getUTCFullYear(),
      month: dateOnly.getUTCMonth() + 1,
      day: dateOnly.getUTCDate(),
      hour: time.getUTCHours(),
      minute: time.getUTCMinutes(),
      second: time.getUTCSeconds(),
    },
    timeZone,
  )
}

export function combineInstantDateAndTime(date: Date, time: Date, timeZone = APP_TIME_ZONE) {
  const parts = getPartsInTimeZone(date, timeZone)

  return zonedDateTimeToUtc(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: time.getUTCHours(),
      minute: time.getUTCMinutes(),
      second: time.getUTCSeconds(),
    },
    timeZone,
  )
}

export function localDateTimeToUtc(value: string, timeZone = APP_TIME_ZONE) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) {
    return new Date(value)
  }

  return zonedDateTimeToUtc(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: Number(match[6] ?? '0'),
    },
    timeZone,
  )
}

function zonedDateTimeToUtc(parts: DateParts, timeZone: string) {
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  let utc = new Date(localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc), timeZone))
  utc = new Date(localAsUtc - getTimeZoneOffsetMs(utc, timeZone))

  return utc
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getPartsInTimeZone(date, timeZone)
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)

  return localAsUtc - date.getTime()
}

function getPartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  }
}
