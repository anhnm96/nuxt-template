<script lang="tsx">
import type { KeepAliveProps, PropType } from 'vue'
import { KeepAlive } from 'vue'
import { injectDialogRootContext } from './Tabs.vue'

interface TabPanelsContext {
  eager: boolean
}

export const [provideDialogPanelsContext, injectDialogPanelsContext]
= createContext<TabPanelsContext>('TabPanels')

export default defineComponent({
  props: {
    eager: Boolean,
    keepAlive: [Boolean, Object] as PropType<boolean | KeepAliveProps>,
  },
  setup(props, { slots }) {
    const { modelValue } = injectDialogRootContext()!

    provideDialogPanelsContext({ eager: props.eager })

    if (props.eager) {
      return () => (
        <>
          {slots.default?.()}
        </>
      )
    }

    // init key to work with KeepAlive
    const slotDefault = slots.default?.()
    slotDefault?.forEach((node) => {
      // @ts-expect-error type
      if (node.type.__name === 'TabPanel') {
        node.key = node.props!.value
        node.props!.key = node.props!.value
      }
    })

    return () => {
      const content = []
      for (const node of slotDefault || []) {
        if (node.props?.value === modelValue.value) {
          if (props.keepAlive) content.push(h(KeepAlive, typeof props.keepAlive === 'object' ? props.keepAlive : undefined, node))
          else content.push(node)
        }

        // @ts-expect-error type
        if (node.type.__name !== 'TabPanel') {
          content.push(node)
        }
      }

      return (
        <>
          {content}
        </>
      )
    }
  },
})
</script>
