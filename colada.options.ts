import type { PiniaColadaOptions } from '@pinia/colada'

export default {
  queryOptions: {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 mins
  },
} satisfies PiniaColadaOptions
