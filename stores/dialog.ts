import type { Component } from 'vue'
import type { ComponentEmit, ComponentProps } from 'vue-component-type-helpers'
import type { InfoProps } from '~/components/confirm-dialog/info.vue'
import type { WarnProps } from '~/components/confirm-dialog/warn.vue'
import type { DialogRootProps } from '~/components/dialog/Dialog.vue'

interface DialogPropsMap {
  info: InfoProps
  warn: WarnProps
}

export interface Dialog<T extends Component> {
  id?: string | number
  component: T
  // https://stackoverflow.com/questions/68602712/extracting-the-prop-types-of-a-component-in-vue-3-typescript-to-use-them-somew
  props?: ComponentProps<T> & DialogRootProps
  resolve: (value?: any) => void
}

export const useDialogStore = defineStore('dialog', () => {
  const componentName = shallowRef()
  const resolve = shallowRef()
  const props = shallowRef()
  const id = shallowRef(0)
  const dialogs = ref<Dialog<Component>[]>([])
  // the 'emit close' must be defined last in component defineEmits
  function showDialog<T extends Component>(dialog: Omit<Dialog<T>, 'resolve'>) {
    // @ts-expect-error type
    return new Promise<Parameters<ComponentEmit<T>>[1]>((resolve) => {
      dialogs.value.push({
        ...dialog,
        id: dialog.id || id.value++,
        resolve,
      })
    })
  }

  function closeDialog(id: string | number, value?: any) {
    const dialogIndex = dialogs.value.findIndex(dialog => dialog.id === id)
    if (dialogIndex > -1) {
      dialogs.value[dialogIndex].resolve?.(value)
      dialogs.value.splice(dialogIndex, 1)
    }
  }

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

  return { componentName, resolve, props, openAlert, dialogs, showDialog, closeDialog }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useDialogStore, import.meta.hot))
