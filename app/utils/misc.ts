import type { FetchError } from 'ofetch'

// Type guard for ofetch's FetchError — narrows unknown to FetchError
export function isFetchError(err: unknown): err is FetchError {
  return typeof err === 'object' && err !== null && 'data' in err && typeof (err as any).status === 'number'
}

export function getErrorMessage(error: unknown, defaultMessage = 'Unknown Error'): string {
  if (typeof error === 'string') return error

  if (isFetchError(error)) {
    return error.data?.message ?? defaultMessage
  }

  if (
    error
    && typeof error === 'object'
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message
  }
  console.error('Unable to get error message for error', error)
  return defaultMessage
}

export function clsx(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function getPtValue(pt: Record<string, any> | undefined, key: string) {
  if (!pt) return
  const value = pt[key]

  if (typeof value === 'string' || Array.isArray(value)) {
    return { class: value }
  }

  return value
}

export function sleep(duration = 0) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

/** check if value is null */
export function isNull(value: any): value is null {
  return value === null
}

/** check if value is undefined */
export function isUndefined(value: any): value is undefined {
  return value === undefined
}

/** null or undefined */
export function isNullish(value: any): value is Nullish {
  return isNull(value) || isUndefined(value)
}

/** not null, undefined */
export function isNotNullish<T>(value: T): value is Exclude<T, null | undefined> {
  return !isNullish(value)
}

export function isPrimitive(val: unknown): val is Primitive {
  switch (typeof val) {
    case 'string':
    case 'number':
    case 'bigint':
    case 'boolean':
    case 'symbol': {
      return true
    }
    default:
      return false
  }
}

export const isFalsy = (val: unknown): val is Falsy => !val
