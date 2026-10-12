<script setup lang="ts" generic="T">
import type { AutocompleteOption } from './useAutocomplete'
import { injectAutocompleteContext } from './context'

/**
 * One row of the listbox.
 *
 * One signal per concept: the tick means Selected, the tint means Active. `aria-selected`
 * already carries the meaning, so the tick is decorative and `aria-hidden` — but its slot
 * keeps a fixed width even when empty, or the first selection would shift every label.
 */
const props = defineProps<{
  option: AutocompleteOption<T>
  /** Index within Visible Options, so hovering can move the Active Option. */
  index: number
}>()

const { autocomplete, onOptionSelect } = injectAutocompleteContext()

const isSelected = computed(() => autocomplete.isSelected(props.option))
const isActive = computed(() => autocomplete.activeKey.value === props.option.key)

function onClick() {
  if (props.option.disabled) return
  onOptionSelect(props.option)
}
</script>

<template>
  <!--
    `mousedown.prevent` keeps DOM focus on the input. Without it, pressing the mouse here
    blurs the input, blur runs Abandon, and Abandon restores the Last Commit over the
    Option the click is about to select.
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
    @mousemove="!option.disabled && autocomplete.setActiveIndex(index)"
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
