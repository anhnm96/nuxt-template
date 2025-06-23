import type { NitroFetchRequest } from 'nitropack'
import type { FetchOptions } from 'ofetch'

export interface AppFetchOptions extends FetchOptions {
  convertRequestToSnakeKey?: boolean
  convertResponseToCamelKey?: boolean
  showAlertOnError?: boolean
  onUploadProgress?: (uploadEvent: ProgressEvent<XMLHttpRequestEventTarget>) => any
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

  async function wrappedApi<T extends ApiResponse<any> | PaginatedResponse2<any>>(request: NitroFetchRequest, options: AppFetchOptions = {}) {
    const _options = Object.assign({ convertResponseToCamelKey: true, showAlertOnError: true }, options)

    if (options.convertRequestToSnakeKey) {
      if (options.query) options.query = camelToSnakeKeys(_options.query)
      if (options.body) options.body = camelToSnakeKeys(_options.body)
    }

    // upload file with progress
    if (options.onUploadProgress) {
      try {
        const response = await uploadFileWithProgress(request.toString(), options.onUploadProgress, options)

        return response.data as T['data']
      } catch (error: any) {
        console.error(error)
      }
      return
    }

    // normal request
    const response = await $api<T>(request, _options as any)

    if (response.status && response.status !== 0) {
      if (_options.showAlertOnError) {
        dialogStore.showAlert({ severity: 'error', description: response.statusText })
      }
      console.error(`request ${request} failed with body: ${_options.body}, query: ${_options.query}. Response code: ${response.status}, message: ${response.statusText}`)
      throw createError({ statusCode: response.status, statusMessage: response.statusText, data: response.data })
    }

    if (_options.convertResponseToCamelKey) {
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

async function uploadFileWithProgress<T>(
  url: string,
  onUploadProgress: AppFetchOptions['onUploadProgress'],
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', options.baseURL + url, true)

    // Copy headers from options if they exist
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string)
      })
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onUploadProgress?.(event)
      }
    })

    // Load event (completed)
    xhr.addEventListener('load', () => {
      const response = JSON.parse(xhr.response)
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof options.onResponse === 'function') {
          options.onResponse({
            response: {
              _data: response,
            },
          } as any)
        }

        resolve(response)
      } else {
        if (typeof options.onResponseError === 'function') {
          options.onResponseError({ response: { _data: response, statusText: xhr.statusText } } as any)
        }
        reject(createError({ statusCode: xhr.status, statusMessage: xhr.statusText, data: response }))
      }
    })

    // error event only fires on network-level errors
    // (like connection issues or CORS failures)
    xhr.addEventListener('error', (event: ProgressEvent) => {
      if (typeof options.onResponseError === 'function') {
        options.onResponseError({ response: { _data: event } } as any)
      }

      reject(createError({ statusCode: 500, statusMessage: 'Network Error', data: event }))
    })

    xhr.send(options?.body as any || null)
  })
}
