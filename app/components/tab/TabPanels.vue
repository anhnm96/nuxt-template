<script lang="tsx">
import type { KeepAliveProps, PropType, VNode } from 'vue'
import { cloneVNode, KeepAlive } from 'vue'
import { injectTabsRootContext, provideTabPanelsContext, toPrimaryValue, toTabValues } from './context'

/** The slot may hold anything. Only a panel answers to a value. */
function isTabPanel(node: VNode) {
  // @ts-expect-error `__name` is not on the VNode type; `defineComponent` sets it.
  return node.type.__name === 'TabPanel'
}

export default defineComponent({
  props: {
    /** Render every panel and hide the inactive ones, rather than mount only the active one. */
    eager: Boolean,
    keepAlive: [Boolean, Object] as PropType<boolean | KeepAliveProps>,
  },
  setup(props, { slots }) {
    const { modelValue } = injectTabsRootContext()

    provideTabPanelsContext({ eager: props.eager })

    if (props.eager) {
      return () => (
        <div>
          {slots.default?.()}
        </div>
      )
    }

    return () => {
      const content = []

      for (const node of slots.default?.() ?? []) {
        // Anything that is not a panel passes straight through. The branches are exclusive:
        // a non-panel child carrying a `value` prop used to satisfy both and render twice.
        if (!isTabPanel(node)) {
          content.push(node)
          continue
        }

        const value = node.props?.value
        if (value === undefined || !toTabValues(value).includes(modelValue.value)) continue

        // KeepAlive caches by key and falls back to the vnode type, which every panel
        // shares. Key on every render: the slot builds new vnodes each time it re-runs,
        // and keying once left KeepAlive holding one entry for all of them.
        // A VNode key cannot be a bigint or a boolean, so the value is named, not cast.
        const panel = node.key == null
          ? cloneVNode(node, { key: String(toPrimaryValue(value)) })
          : node

        content.push(props.keepAlive
          ? h(KeepAlive, typeof props.keepAlive === 'object' ? props.keepAlive : undefined, panel)
          : panel)
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
