import type { ComponentEmit, ComponentProps } from 'vue-component-type-helpers'
import type { DialogRootProps } from '~/components/dialog/Dialog.vue'
import AlertDialog from '~/components/AlertDialog.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'

export interface Dialog<T extends Component> {
  id?: string | number
  component: T
  // https://stackoverflow.com/questions/68602712/extracting-the-prop-types-of-a-component-in-vue-3-typescript-to-use-them-somew
  props?: ComponentProps<T> & DialogRootProps
  resolve: (value?: any) => void
}

export const useDialogStore = defineStore('dialog', () => {
  let id = 0
  const dialogs = ref<Dialog<Component>[]>([])

  // the 'emit close' must be defined last in component defineEmits
  function showDialog<T extends Component>(dialog: Omit<Dialog<T>, 'resolve'>) {
    // @ts-expect-error type
    return new Promise<Parameters<ComponentEmit<T>>[1]>((resolve) => {
      dialogs.value.push({
        component: dialog.component,
        id: dialog.id || id++,
        resolve,
        props: Object.assign({ open: true }, dialog.props),
      })
    })
  }

  function closeDialog(id: string | number, value?: any) {
    const dialogIndex = dialogs.value.findIndex(dialog => dialog.id === id)
    if (dialogIndex > -1) {
      dialogs.value[dialogIndex]!.resolve?.(value)
      dialogs.value.splice(dialogIndex, 1)
    }
  }

  function showAlert(props: Dialog<typeof AlertDialog>['props']) {
    return showDialog({ component: markRaw(AlertDialog), props })
  }

  function showConfirm(props: Dialog<typeof ConfirmDialog>['props']) {
    return showDialog({ component: markRaw(ConfirmDialog), props })
  }

  return { dialogs, showDialog, closeDialog, showAlert, showConfirm }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useDialogStore, import.meta.hot))
