<script setup lang="ts">
import type { RowHeights } from './useVirtualRows'
import type { ListGroup } from '~/composables/useOptionList'
import { injectListboxContext } from './context'
import ListboxOption from './ListboxOption.vue'
import { toRowHeights, useVirtualRows } from './useVirtualRows'

/**
 * The listbox that `Select` and `Autocomplete` show in their Popover: Groups, Options, the
 * empty state and the first-load state.
 *
 * Internal to those two hosts. It is not a component that a consumer composes with.
 *
 * What it draws arrives as props and not through `ListboxContext`. `AutocompletePopup` must
 * be able to pass a frozen snapshot while it closes, and a view that read the list itself
 * could not be frozen from outside. See DESIGN.md.
 */
export type ListboxState = 'loading' | 'options' | 'empty'

const props = defineProps<{
  /** The listbox id. The host's control names it in `aria-controls`. */
  id: string
  /**
   * The three states are ordered, not combined. A first load has nothing to report yet, so
   * the host must give it priority over `empty`.
   *
   * While `loading`, no element carries `id`. The host must then remove its `aria-controls`.
   */
  state: ListboxState
  /** Drawn while `state` is `options`. Rendering only — navigation stays flat. */
  groups: ListGroup<any>[]
  /** Labels the listbox, so the control's own label is announced with it. */
  labelledBy?: string
  multiselectable?: boolean
  /** Shown while `state` is `empty`. */
  emptyText?: string
  /** Passed to the `#empty` slot. */
  query?: string
}>()

const { virtual, setScrollToIndex } = injectListboxContext()

const list = useTemplateRef('list')
/**
 * Set in a Virtual List only. An object in a template is a new object on each render of
 * the host, so equal heights keep the object, and the layout is not computed again.
 */
const heights = computed<RowHeights | undefined>((previous) => {
  const next = toRowHeights(virtual())
  const isEqual = previous && next
    && previous.optionHeight === next.optionHeight && previous.groupHeight === next.groupHeight
  return isEqual ? previous : next
})
const { rendered, scrollToIndex: scrollToRow } = useVirtualRows({
  groups: () => props.groups,
  heights,
  scroller: list,
})

function heightStyle(height: number) {
  return { height: `${height}px` }
}
/** In a Virtual List the height is inline, so the Row has the height that the layout counts with. */
const optionStyle = computed(() => heights.value && heightStyle(heights.value.optionHeight))
const labelStyle = computed(() => heights.value && heightStyle(heights.value.groupHeight))

/**
 * Nothing is focused in the list, so the browser does not show the Active Option by itself.
 * @param index index within Visible Options
 */
function scrollToIndex(index: number) {
  if (heights.value) return scrollToRow(index)
  // every Option is in the document, in the order of Visible Options
  const option = list.value?.querySelectorAll('[role="option"]')[index]
  if (!option) return
  option.scrollIntoView({ block: 'nearest' })
  // The label of the Group is sticky, and the browser does not count it: the Option can be
  // in view and below the label.
  const label = option.parentElement!.querySelector(':scope > [data-slot="group-label"]')
  const covered = label ? label.getBoundingClientRect().bottom - option.getBoundingClientRect().top : 0
  if (covered > 0) list.value!.scrollTop -= Math.ceil(covered)
}
setScrollToIndex(scrollToIndex)
</script>

<template>
  <div v-if="state === 'loading'" class="relative grid min-h-24 place-items-center">
    <slot name="loading">
      <InnerLoading />
    </slot>
  </div>

  <div
    v-else
    :id="id"
    ref="list"
    role="listbox"
    class="select-list"
    :aria-labelledby="labelledBy"
    :aria-multiselectable="multiselectable || undefined"
    :data-virtual="heights ? '' : undefined"
    data-slot="listbox"
  >
    <template v-if="state === 'options'">
      <!-- The spacers have the height of the Rows that a Virtual List does not render. -->
      <div v-if="rendered.before" aria-hidden="true" class="shrink-0" :style="heightStyle(rendered.before)" />

      <div
        v-for="{ group, firstIndex, start, options, before, after } in rendered.groups"
        :key="group.id"
        :role="group.label ? 'group' : undefined"
        :aria-labelledby="group.label ? group.id : undefined"
        :data-slot="group.label ? 'option-group' : undefined"
      >
        <!-- group label -->
        <div
          v-if="group.label"
          :id="group.id"
          aria-hidden="true"
          class="select-group-label"
          :style="labelStyle"
          data-slot="group-label"
        >
          <slot name="group" :group="group">
            {{ group.label }}
          </slot>
        </div>

        <div v-if="before" aria-hidden="true" :style="heightStyle(before)" />

        <!--
          options. `aria-posinset` and `aria-setsize`: a screen reader counts the Options in
          the document, and a Virtual List has only some of them there.
        -->
        <ListboxOption
          v-for="(option, optionIndex) in options"
          :key="option.key"
          :option="option"
          :index="firstIndex + optionIndex"
          :style="optionStyle"
          :aria-posinset="heights ? start + optionIndex + 1 : undefined"
          :aria-setsize="heights ? group.options.length : undefined"
        >
          <template #default="optionSlot">
            <slot name="option" v-bind="optionSlot" />
          </template>
        </ListboxOption>

        <div v-if="after" aria-hidden="true" :style="heightStyle(after)" />
      </div>

      <div v-if="rendered.after" aria-hidden="true" class="shrink-0" :style="heightStyle(rendered.after)" />
    </template>

    <div v-else class="px-2 py-3 text-center text-muted initial:text-sm" role="presentation">
      <slot name="empty" :query="query ?? ''">
        {{ emptyText }}
      </slot>
    </div>
  </div>
</template>
