import { camelCase, snakeCase } from 'lodash-es'

// #region convert to snake key
type SnakeCaseObject<T> = T extends Array<infer U>
  ? Array<SnakeCaseObject<U>>
  : T extends Record<string, unknown>
    ? { [K in keyof T as SnakeCaseKey<K>]: SnakeCaseObject<T[K]> }
    : T

type SnakeCaseKey<K> = K extends string ? SnakeCase<K> : K
type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}`
  : S

export function camelToSnakeKeys<T>(obj: T): SnakeCaseObject<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj as SnakeCaseObject<T>
  }

  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnakeKeys(item)) as SnakeCaseObject<T>
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    const snakeKey = snakeCase(key)
    return {
      ...acc,
      [snakeKey]: camelToSnakeKeys(value),
    }
  }, {} as Record<string, unknown>) as SnakeCaseObject<T>
}
// #endregion

// #region convert to camel case
type CamelCaseObject<T> = T extends Array<infer U>
  ? Array<CamelCaseObject<U>>
  : T extends Record<string, unknown>
    ? { [K in keyof T as CamelCaseKey<K>]: CamelCaseObject<T[K]> }
    : T

type CamelCaseKey<K> = K extends string ? CamelCase<K> : K
type CamelCase<S extends string> = S extends `${infer First}_${infer Rest}`
  ? `${First}${Capitalize<CamelCase<Rest>>}`
  : S

export function snakeToCamelKeys<T>(obj: T): CamelCaseObject<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj as CamelCaseObject<T>
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamelKeys(item)) as CamelCaseObject<T>
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    const camelKey = camelCase(key)
    return {
      ...acc,
      [camelKey]: snakeToCamelKeys(value),
    }
  }, {} as Record<string, unknown>) as CamelCaseObject<T>
}
// #endregion
