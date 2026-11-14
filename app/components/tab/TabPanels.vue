<script lang="ts">
import type { KeepAliveProps, PropType, VNode } from 'vue'
import { cloneVNode, KeepAlive } from 'vue'
import { injectTabsRootContext, provideTabPanelsContext, toPrimaryValue, toTabValues } from './context'
import TabPanel from './TabPanel.vue'

export default defineComponent({
  props: {
    /** Render every panel and hide the inactive ones, rather than mount only the active one. */
    eager: Boolean,
    keepAlive: [Boolean, Object] as PropType<boolean | KeepAliveProps>,
  },
  setup(props, { slots }) {
    const { modelValue } = injectTabsRootContext()

    // Read one time. The caller chooses a mode; a later change of `eager` has no effect.
    const eager = props.eager
    provideTabPanelsContext({ eager })

    /** The slot may hold anything. Only a panel answers to a value; the rest always renders. */
    function isInactivePanel(node: VNode) {
      return node.type === TabPanel
        && !toTabValues(node.props?.value).includes(modelValue.value)
    }

    function renderPanel(node: VNode) {
      if (node.type !== TabPanel) return node

      // KeepAlive caches by key and falls back to the vnode type, which every panel
      // shares. Key on every render: the slot builds new vnodes each time it re-runs.
      // A VNode key cannot be a bigint or a boolean, so the value is named, not cast.
      const panel = node.key == null
        ? cloneVNode(node, { key: String(toPrimaryValue(node.props?.value)) })
        : node

      return props.keepAlive ? keepAlive(panel) : panel
    }

    function keepAlive(panel?: VNode) {
      const keepAliveProps = typeof props.keepAlive === 'object' ? props.keepAlive : null
      return h(KeepAlive, keepAliveProps, () => (panel ? [panel] : []))
    }

    return () => {
      const children = slots.default?.() ?? []

      // Under `eager` each panel hides itself with `v-show`, so every child renders.
      if (eager) return h('div', children)

      // Fragments are opened into one list, so a panel that a `v-for` or a `<template>`
      // wraps is found, and one `KeepAlive` serves every panel wherever it was written.
      const nodes = flattenFragments(children)
        .filter(node => !isInactivePanel(node))
        .map(renderPanel)

      // No panel answers to the model. An empty `KeepAlive` holds the cache until one does;
      // without it the cache goes with the last active panel.
      if (props.keepAlive && !nodes.some(node => node.type === KeepAlive)) nodes.push(keepAlive())

      return h('div', nodes)
    }
  },
})
</script>
