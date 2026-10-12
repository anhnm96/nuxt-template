<script setup lang="ts">
import type { AutocompleteGroup } from './useAutocomplete'
import AutocompleteOption from './AutocompleteOption.vue'
import { injectAutocompleteContext } from './context'

const ctx = injectAutocompleteContext()
const { autocomplete } = ctx

/**
 * The four states are ordered, not combined. Below the threshold nothing has been asked for
 * yet, so neither a spinner nor "No results" is true — a field that announces no results
 * before the user has typed is wrong, and under `externalFilter` it would be wrong for the
 * length of every request.
 *
 * `listbox` is aliased from `listboxIsRendered` rather than recomputed: the input's
 * `aria-controls` hangs off the same conditions, and an `aria-controls` pointing at an id that
 * resolves to nothing is worse than no relationship at all.
 */
type PopupView
  = | { kind: 'min-query' }
    | { kind: 'loading' }
    | { kind: 'options', groups: AutocompleteGroup<any>[] }
    | { kind: 'empty', query: string }

const liveView = computed<PopupView>(() => {
  if (autocomplete.isAwaitingQuery.value) return { kind: 'min-query' }
  if (autocomplete.isLoadingFirstPage.value) return { kind: 'loading' }
  const groups = autocomplete.groups.value
  if (!groups.length) return { kind: 'empty', query: autocomplete.query.value }
  return { kind: 'options', groups }
})

/**
 * What the popup draws. It stops tracking the moment the popup starts closing.
 *
 * `Dropdown` keeps the popover mounted for its leave transition, and Abandon writes both models
 * inside that same window — so a field reverting to its Last Commit would visibly swap
 * "No results" for the full list on its way out. Nothing is navigable while it closes, so
 * freezing costs nothing; `useAutocomplete` keeps reporting the truth to everything else.
 *
 * Watching `isOpen` as well as the view is what makes reopening pick the live state back up.
 * The popup does remount on each open today, which would hide the omission — and leave the
 * freeze depending on a detail of how `Dropdown` nests its `v-if` inside its `<Transition>`.
 */
const view = shallowRef(liveView.value)
watch([liveView, ctx.isOpen], ([next, isOpen]) => {
  if (isOpen) view.value = next
})

/** Index within Visible Options — options are rendered per group but navigated flat. */
function flatIndex(groups: AutocompleteGroup<any>[], groupIndex: number, optionIndex: number) {
  let base = 0
  for (let i = 0; i < groupIndex; i++) base += groups[i]!.options.length
  return base + optionIndex
}
</script>

<template>
  <!--
    `mousedown.prevent` on the whole popup, not only on each row: pressing on padding, on a
    group heading or on the empty state would otherwise blur the input and run Abandon.
  -->
  <div class="autocomplete-popup flex flex-col" data-slot="autocomplete-popup" @mousedown.prevent>
    <div
      v-if="view.kind === 'min-query'"
      class="px-2 py-3 text-center text-muted initial:text-sm"
      role="presentation"
    >
      <slot name="min-query" :min-query-length="autocomplete.minQueryLength.value">
        {{ ctx.minQueryText.value }}
      </slot>
    </div>

    <div v-else-if="view.kind === 'loading'" class="relative grid min-h-24 place-items-center">
      <slot name="loading">
        <InnerLoading />
      </slot>
    </div>

    <div
      v-else
      :id="ctx.listboxId.value"
      role="listbox"
      class="select-list"
      :aria-labelledby="ctx.labelledBy.value"
      data-slot="autocomplete-list"
    >
      <template v-if="view.kind === 'options'">
        <div
          v-for="(group, groupIndex) in view.groups"
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
            data-slot="group-label"
          >
            <slot name="group" :group="group">
              {{ group.label }}
            </slot>
          </div>

          <!-- options -->
          <AutocompleteOption
            v-for="(option, optionIndex) in group.options"
            :key="option.key"
            :option="option"
            :index="flatIndex(view.groups, groupIndex, optionIndex)"
          >
            <template #default="optionSlot">
              <slot name="option" v-bind="optionSlot" />
            </template>
          </AutocompleteOption>
        </div>
      </template>

      <div v-else class="px-2 py-3 text-center text-muted initial:text-sm" role="presentation">
        <slot name="empty" :query="view.query">
          {{ ctx.emptyText.value }}
        </slot>
      </div>
    </div>
  </div>
</template>
