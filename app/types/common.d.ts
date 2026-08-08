type Severity = 'info' | 'success' | 'warn' | 'error'
type Position = 'top' | 'bottom' | 'left' | 'right'
type ValueOf<T> = T[keyof T]
type Primitive = string | number | bigint | boolean | symbol
type Key = string | number | symbol
type Falsy = false | '' | 0 | null | undefined
type Nullish = null | undefined
type MaybeNull<T> = T | null
type MaybeUndefined<T> = T | undefined
type MaybeNullish<T> = T | null | undefined
type LooseAutocomplete<T extends string> = T | Omit<string, T>

/**
 * Anything Vue's `class` binding accepts, minus the top-level object form.
 * Falsy array members are allowed so `[cond && 'text-sm']` type-checks —
 * Vue's `normalizeClass` drops them.
 */
type ClassValue = string | (string | Record<string, boolean> | Falsy)[]

/**
 * A pass-through target: either the full props object, or a class shorthand.
 * `<Checkbox :label-props="{ class: 'text-sm' }" />` and
 * `<Checkbox label-props="text-sm" />` both resolve to the same thing.
 */
type PtSlot<T> = T | ClassValue

/** Turns a map of pass-through targets into its shorthand-accepting equivalent. */
type Pt<T extends Record<string, any>> = { [K in keyof T]?: PtSlot<T[K]> }

type PaginatedResponse<T, Key extends string> = {
  [K in Key]: T[]; // Dynamic key for the data array (e.g., "posts", "products")
} & {
  total: number
  skip: number
  limit: number
}

interface ApiResponse<T> {
  status: number
  statusText: string
  data: T
}

interface PaginatedResponse2<T> {
  status: number
  statusText: string
  data: {
    list: T[]
    total: number
    skip: number
    limit: number
  }
}

interface Service {
  gameNo: number
  gameId: string
  platformType: string
  gameName: string
  hasGuid: boolean
}

interface CodeNameOption {
  code: string
  name: string
}

interface Product {
  id: number
  title: string
  description: string
  category: string
  price: string
  stock: number
  thumbnail: string
  meta: {
    createdAt: string
    updatedAt: string
  }
}

interface Categories {
  name: string
  slug: string
}
