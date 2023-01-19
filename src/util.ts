type TimestampStylesString = 'd' | 'f' | 'F' | 'D' | 't' | 'T' | 'R'

export function toTimestamp(timeOrSeconds?: number | Date, style?: TimestampStylesString): string {
  if (typeof timeOrSeconds !== 'number') {
    timeOrSeconds = Math.floor((timeOrSeconds?.getTime() ?? Date.now()) / 1000)
  }
  return typeof style === 'string' ? `<t:${timeOrSeconds}:${style}>` : `<t:${timeOrSeconds}>`
}
