import { http, HttpResponse } from 'msw'

export default defineNuxtMswWorkerOption(() => {
  const handlers = [
    http.get('/api/user', () => {
      return HttpResponse.json({
        message: 'Hello Worker!',
      })
    }),
    http.get('/api/services', async () => {
      const data = await import('./mocks/inquiries/service-list.mock.json')
      return HttpResponse.json(data.default)
    }),
    http.get('/api/services/:serviceId/languages', async () => {
      const data = await import('./mocks/inquiries/service-language.mock.json')
      return HttpResponse.json(data.default)
    }),
    http.get('/api/inquiries/list', async ({ request }) => {
      const url = new URL(request.url)
      const adviser = url.searchParams.get('adviser')
      if (adviser === 'true') {
        const data = await import('./mocks/inquiries/inquiry-list.mock.json')
        return HttpResponse.json(data.default)
      }
      const data = await import('./mocks/inquiries/inquiry-list-2.mock.json')
      return HttpResponse.json(data.default)
    }),
    http.get('/api/inquiries/codes', async () => {
      const data = await import('./mocks/inquiries/common-codes.mock.json')
      return HttpResponse.json(data.default)
    }),
    http.get('/api/inquiries/services/:serviceId/answer-templates', async () => {
      const data = await import('./mocks/inquiries/inquiry-template-list.mock.json')
      return HttpResponse.json(data.default)
    }),
    http.get(`/api/inquiries/:inquiryId/history`, async () => {
      const data = await import('./mocks/inquiries/inquiry-process-history.mock.json')
      return HttpResponse.json(data.default)
    }),
    http.get(`/api/inquiries/resolution-rate`, async () => {
      const data = await import('./mocks/inquiries/resolution-rate.mock.json')
      return HttpResponse.json(data.default)
    }),
    http.get(`/api/schedule/list`, async () => {
      const data = await import('./mocks/schedule/events.mock.json')
      return HttpResponse.json(data.default)
    }),
  ]

  return {
    handlers,
    workerOptions: {
      onUnhandledRequest: 'bypass',
    },
    onWorkerStarted(worker, nuxtApp) {
      nuxtApp.hook('app:mounted', () => {
        // const route = useRoute()
        // console.log(worker.listHandlers())
      })
    },

  }
})
