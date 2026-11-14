<script setup lang="ts">
import type { ListboxState } from '~/components/base/listbox/Listbox.vue'
import type { ListGroup } from '~/composables/useOptionList'
import Listbox from '~/components/base/listbox/Listbox.vue'
import { injectAutocompleteContext } from './context'

const ctx = injectAutocompleteContext()
const { autocomplete } = ctx

/**
 * The three states are ordered, not combined. A first load has nothing to report yet, so it
 * outranks "No results" — a field that announces no results while it is still fetching them is
 * wrong.
 *
 * `loading` is aliased from `isLoadingFirstPage` rather than recomputed: `listboxIsRendered`,
 * which the input's `aria-controls` hangs off, uses the same condition, and an `aria-controls`
 * pointing at an id that resolves to nothing is worse than no relationship at all.
 */
interface PopupView {
  state: ListboxState
  groups: ListGroup<any>[]
  query: string
}

const liveView = computed<PopupView>(() => {
  const groups = autocomplete.groups.value
  if (autocomplete.isLoadingFirstPage.value) return { state: 'loading', groups, query: '' }
  // Only the empty state shows the Query, so only that state reads it. A keystroke that
  // leaves the Groups unchanged, as under `externalFilter`, then does not replace the view.
  if (groups.length) return { state: 'options', groups, query: '' }
  return { state: 'empty', groups, query: autocomplete.query.value }
})

/**
 * What the popup draws. It stops tracking the moment the popup starts closing.
 *
 * `Popover` keeps the surface mounted for its leave transition, and Abandon writes both models
 * inside that same window — so a field reverting to its Last Commit would visibly swap
 * "No results" for the full list on its way out. Nothing is navigable while it closes, so
 * freezing costs nothing; `useAutocomplete` keeps reporting the truth to everything else.
 *
 * Watching `isOpen` as well as the view is what makes reopening pick the live state back up.
 * The popup does remount on each open today, which would hide the omission — and leave the
 * freeze depending on a detail of how `PopoverSurface` nests its `v-if` inside its
 * `<Transition>`.
 */
const view = shallowRef(liveView.value)
watch([liveView, ctx.isOpen], ([next, isOpen]) => {
  if (isOpen) view.value = next
})
</script>

<template>
  <!--
    `mousedown.prevent` on the whole popup, not only on each row: pressing on padding, on a
    group heading or on the empty state would otherwise blur the input and run Abandon.
  -->
  <div class="autocomplete-popup flex flex-col" data-slot="autocomplete-popup" @mousedown.prevent>
    <!-- listbox -->
    <Listbox
      :id="ctx.listboxId.value"
      :state="view.state"
      :groups="view.groups"
      :labelled-by="ctx.labelledBy.value"
      :empty-text="ctx.emptyText.value"
      :query="view.query"
    >
      <template #loading>
        <slot name="loading" />
      </template>
      <template #group="slotProps">
        <slot name="group" v-bind="slotProps" />
      </template>
      <template #option="slotProps">
        <slot name="option" v-bind="slotProps" />
      </template>
      <template #empty="slotProps">
        <slot name="empty" v-bind="slotProps" />
      </template>
    </Listbox>
  </div>
</template>
