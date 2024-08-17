export default defineNuxtPlugin(() => {
  const $api = $fetch.create({
    baseURL: '/api',
    headers: useRequestHeaders(['cookie']),
    // @ts-expect-error type mismatch
    onResponseError({ response }) {
      if (response.status === 401) {
        return navigateTo('/login')
      }
    },
  })

  // expose to useNuxtApp().$api
  return {
    provide: {
      api: $api,
    },
  }
})
