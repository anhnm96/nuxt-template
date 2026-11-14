<script setup lang="ts" generic="T">
import type { ListOption } from '~/composables/useOptionList'
import { injectListboxContext } from './context'

/**
 * One row of the listbox.
 *
 * One signal per concept: the tick means Selected, the tint means Active. `aria-selected`
 * already carries the meaning, so the tick is decorative and `aria-hidden` — but its slot
 * keeps a fixed width even when empty, or the first selection would shift every label.
 */
const props = defineProps<{
  option: ListOption<T>
  /** Index within Visible Options, so hovering can move the Active Option. */
  index: number
}>()

const { activeKey, isSelected: isOptionSelected, setActiveIndex, onOptionSelect } = injectListboxContext()

const isSelected = computed(() => isOptionSelected(props.option))
const isActive = computed(() => activeKey.value === props.option.key)

function onClick() {
  if (props.option.disabled) return
  onOptionSelect(props.option)
}
</script>

<template>
  <!--
    `mousedown.prevent` keeps DOM focus on the host's control. In an Autocomplete a press
    here would otherwise blur the input; blur runs Abandon, and Abandon restores the Last
    Commit over the Option that the click is about to select.
  -->
  <div
    :id="option.id"
    role="option"
    class="select-option"
    :aria-selected="isSelected"
    :aria-disabled="option.disabled || undefined"
    :data-active="isActive || undefined"
    :data-disabled="option.disabled || undefined"
    data-slot="option"
    @mousemove="!option.disabled && setActiveIndex(index)"
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
