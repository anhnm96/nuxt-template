import * as v from 'valibot'

export default defineNuxtPlugin({
  dependsOn: ['i18n:plugin'],
  setup() {
    const { t } = useNuxtApp().$i18n

    v.setSpecificMessage(v.string, () => t('error.required'))
    v.setSpecificMessage(v.nonEmpty, () => t('error.required'))
  },
})
