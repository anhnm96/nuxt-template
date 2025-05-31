<script lang="tsx">
import type { KeepAliveProps, PropType } from 'vue'
import { KeepAlive } from 'vue'
import { injectTabsRootContext, provideTabPanelsContext } from './context'

export default defineComponent({
  props: {
    // render TabPanel using v-show instead of v-if
    eager: Boolean,
    keepAlive: [Boolean, Object] as PropType<boolean | KeepAliveProps>,
  },
  setup(props, { slots }) {
    const { modelValue } = injectTabsRootContext()!

    provideTabPanelsContext({ eager: props.eager })

    if (props.eager) {
      return () => (
        <div>
          {slots.default?.()}
        </div>
      )
    }

    // init key to work with KeepAlive
    const slotDefault = computed(() => slots.default?.())
    slotDefault.value?.forEach((node) => {
      // @ts-expect-error type
      if (node.type.__name === 'TabPanel' && !node.key) {
        node.key = node.props!.value
        node.props!.key = node.props!.value
      }
    })

    return () => {
      const content = []
      for (const node of slotDefault.value || []) {
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
        <div>
          {content}
        </div>
      )
    }
  },
})
</script>
