import Konva from 'konva'
import VueKonva from 'vue-konva'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueKonva, { Konva })
})
