type Severity = 'info' | 'success' | 'warn' | 'error'
type Position = 'top' | 'bottom' | 'left' | 'right'

type PaginatedResponse<T, Key extends string> = {
  [K in Key]: T[]; // Dynamic key for the data array (e.g., "posts", "products")
} & {
  total: number
  skip: number
  limit: number
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
