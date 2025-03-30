import type { NitroFetchRequest } from 'nitropack'
import type { FetchOptions } from 'ofetch'

export interface AppFetchOptions extends FetchOptions {
  convertRequestToSnakeKey?: boolean
  convertResponseToCamelKey?: boolean
  showAlertOnError?: boolean
}

export default defineNuxtPlugin(() => {
  const dialogStore = useDialogStore()
  const $api = $fetch.create({
    baseURL: '/api',
    headers: useRequestHeaders(['cookie']),
    // @ts-expect-error type
    onResponseError({ response }) {
      if (response.status === 401) {
        return navigateTo('/login')
      }
    },
  })

  async function wrappedApi<T extends ApiResponse<any> | PaginatedResponse2<any>>(request: NitroFetchRequest, options: AppFetchOptions = { convertResponseToCamelKey: true, showAlertOnError: true }) {
    if (options.convertRequestToSnakeKey) {
      if (options.query) options.query = camelToSnakeKeys(options.query)
      if (options.body) options.body = camelToSnakeKeys(options.body)
    }
    const response = await $api<T>(request, options as any)

    if (response.status && response.status !== 0) {
      if (options.showAlertOnError) {
        dialogStore.showAlert({ severity: 'error', description: response.statusText })
      }
      console.error(`request ${request} failed with body: ${options.body}, query: ${options.query}. Response code: ${response.status}, message: ${response.statusText}`)
      throw createError({ statusCode: response.status, statusMessage: response.statusText })
    }

    if (options.convertResponseToCamelKey) {
      response.data = snakeToCamelKeys(response.data) as any
    }

    return response.data as T['data']
  }

  // expose to useNuxtApp().$api
  return {
    provide: {
      api: wrappedApi,
    },
  }
})
