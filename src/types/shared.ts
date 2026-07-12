export interface PageResponse<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
  first: boolean
}

export interface ApiError {
  message: string
  status: number
  timestamp?: string
  fieldErrors?: Record<string, string>
}
