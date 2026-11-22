const ISO_WITH_OFFSET = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/

/** Moves whole seconds to UTC and keeps the supplied fractional digits. */
export const canonicalUtcInstant = (value: string): string | undefined => {
  const match = ISO_WITH_OFFSET.exec(value.trim())
  if (!match) return undefined
  const [, local, fraction, , offsetSign, hours, minutes] = match
  const localMillis = Date.parse(local + 'Z')
  if (!Number.isFinite(localMillis) || new Date(localMillis).toISOString().slice(0, 19) !== local) return undefined
  const hoursNumber = Number(hours ?? 0)
  const minutesNumber = Number(minutes ?? 0)
  if (hoursNumber > 18 || minutesNumber >= 60 || (hoursNumber === 18 && minutesNumber > 0)) return undefined
  const offset = (hoursNumber * 60 + minutesNumber) * (offsetSign === '-' ? -1 : 1)
  const utc = new Date(localMillis - offset * 60_000).toISOString()
  return /^\d{4}-/.test(utc) ? utc.slice(0, 19) + (fraction ?? '') + 'Z' : undefined
}

export const utcInstantNanos = (utc: string): bigint => {
  const fractional = utc.slice(19, -1).replace(/^\./, '').padEnd(9, '0')
  return BigInt(Date.parse(utc.slice(0, 19) + 'Z')) * 1_000_000n + BigInt(fractional)
}
