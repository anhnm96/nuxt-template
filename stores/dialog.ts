import type { InfoProps } from '~/components/confirm-dialog/info.vue'
import type { WarnProps } from '~/components/confirm-dialog/warn.vue'

interface DialogPropsMap {
  info: InfoProps
  warn: WarnProps
}

export const useDialogStore = defineStore('dialog', () => {
  const componentName = shallowRef()
  const resolve = shallowRef()
  const props = shallowRef()

  async function openAlert<R, K extends keyof DialogPropsMap>(type: K, _props?: DialogPropsMap[K]) {
    componentName.value = type
    return new Promise<R>((_resolve) => {
      resolve.value = _resolve
      props.value = _props
    }).finally(() => {
      resolve.value = undefined
      componentName.value = ''
    })
  }

  return { componentName, resolve, props, openAlert }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useDialogStore, import.meta.hot))
