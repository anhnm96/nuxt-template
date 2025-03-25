import { http, HttpResponse } from 'msw'

export default defineNuxtMswWorkerOption(() => {
  const handlers = [
    // Intercept "GET /api/user" requests...
    http.get('/api/user', () => {
      // ...and respond to them using this JSON response.
      return HttpResponse.json({
        message: 'Hello Worker!',
      })
    }),
  ]

  return {
    handlers,
    workerOptions: {
      // onUnhandledRequest: 'bypass',
    },
    onWorkerStarted(worker, nuxtApp) {
      nuxtApp.hook('app:mounted', () => {
        // const route = useRoute()
        // console.log(worker.listHandlers())
      })
    },

  }
})
