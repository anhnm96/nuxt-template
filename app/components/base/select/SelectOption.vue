<script setup lang="ts" generic="T">
import type { SelectOption } from './useSelect'
import { injectSelectContext } from './context'

/**
 * One row of the listbox.
 *
 * One signal per concept: the tick means Selected, the tint means Active. `aria-selected`
 * already carries the meaning, so the tick is decorative and `aria-hidden` — but its slot
 * keeps a fixed width even when empty, or the first selection would shift every label.
 */
const props = defineProps<{
  option: SelectOption<T>
  /** Index within Visible Options, so hovering can move the Active Option. */
  index: number
}>()

const { select, onOptionSelect } = injectSelectContext()

const isSelected = computed(() => select.isSelected(props.option))
const isActive = computed(() => select.activeKey.value === props.option.key)

function onClick() {
  if (props.option.disabled) return
  onOptionSelect(props.option)
}
</script>

<template>
  <div
    :id="option.id"
    role="option"
    class="select-option"
    :aria-selected="isSelected"
    :aria-disabled="option.disabled || undefined"
    :data-active="isActive || undefined"
    :data-disabled="option.disabled || undefined"
    data-slot="option"
    @mousemove="!option.disabled && select.setActiveIndex(index)"
    @mousedown.prevent
    @click="onClick"
  >
    <span class="select-option-check" aria-hidden="true">
      <Icon v-if="isSelected" size="14" name="ph:check-bold" />
    </span>
    <slot :option="option" :selected="isSelected" :active="isActive">
      <span class="truncate">{{ option.label }}</span>
    </slot>
  </div>
</template>
