import type { InfoProps } from '@/components/confirm-dialog/info.vue'

interface DialogPropsMap {
  info: InfoProps
  warn: never
}

export const useDialogStore = defineStore('dialog', () => {
  const componentName = shallowRef()
  const resolve = shallowRef()
  const props = shallowRef()

  async function open<R, K extends keyof DialogPropsMap>(type: K, _props?: DialogPropsMap[K]) {
    componentName.value = type
    return new Promise<R>((_resolve) => {
      resolve.value = _resolve
      props.value = _props
    }).finally(() => {
      resolve.value = undefined
      componentName.value = ''
    })
  }

  return { componentName, resolve, props, open }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useDialogStore, import.meta.hot))
