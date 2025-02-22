type Severity = 'info' | 'success' | 'warn' | 'error'

type PaginatedResponse<T, Key extends string> = {
  [K in Key]: T[]; // Dynamic key for the data array (e.g., "posts", "products")
} & {
  total: number
  skip: number
  limit: number
}
