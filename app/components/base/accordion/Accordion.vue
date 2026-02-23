<script setup lang="ts">
import { provideAccordionContext } from './context'

const props = defineProps<{
  disabled?: boolean
  multipleExpanded?: boolean
}>()

const expandedKeys = defineModel<Set<Key>>({ default: new Set() })

function toggleExpanded(value: Key) {
  let result: Set<Key>
  if (props.multipleExpanded) {
    result = new Set(expandedKeys.value)
    if (result.has(value)) {
      result.delete(value)
    } else {
      result.add(value)
    }
  } else {
    result = new Set(expandedKeys.value.has(value) ? [] : [value])
  }

  expandedKeys.value = result
}

provideAccordionContext({
  disabled: props.disabled,
  expandedKeys,
  toggleExpanded,
})
</script>

<template>
  <div class="accordion" :data-disabled="disabled">
    <slot />
  </div>
</template>
