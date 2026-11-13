<script lang="ts" setup>
interface Item {
  id: string
  icon?: string
  defaultClass?: string
  activeClass?: string
  ariaLabel?: string
}
const props = defineProps<{
  states: Item[]
}>()
const emit = defineEmits<{
  change: [payload: { event: PointerEvent, value: Item }]
}>()
// The compiler hoists `default` out of setup, so it reads the raw props argument, not `props`.
const selected = defineModel<Item>('selected', {
  default: (rawProps: Record<string, unknown>) => (rawProps.states as Item[])[0]!,
})

function toggle(event: PointerEvent) {
  const index = props.states.findIndex(item => item.id === selected.value.id)
  const next = props.states[(index + 1) % props.states.length]!
  selected.value = next
  emit('change', { event, value: next })
}
</script>

<template>
  <button
    class="btn relative inline-grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:transition-all [&>*]:duration-300"
    :aria-label="selected.ariaLabel"
    @click="toggle"
  >
    <template v-for="state in states">
      <slot
        :id="state.id"
        :icon="state.icon"
        :default-class="state.defaultClass"
        :active-class="state.activeClass || ''"
        :active="selected.id === state.id"
      >
        <SwapItem
          :id="state.id"
          :key="state.id"
          :icon="state.icon"
          :default-class="state.defaultClass"
          :active-class="state.activeClass || ''"
          :active="selected.id === state.id"
        />
      </slot>
    </template>
  </button>
</template>
