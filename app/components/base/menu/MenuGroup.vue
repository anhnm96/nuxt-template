<script setup lang="ts">
/**
 * A named set of Menu Items, drawn under a heading and announced as a unit.
 *
 * It exists for Checked Items above all: APG asks that `menuitemradio` rows sit inside a
 * `role="group"`, so a screen reader can bound the set and name it. Without one, a menu
 * holding two radio sets announces both as one run of rows.
 *
 * Navigation never sees a Group. `Menu` queries Menu Items across its whole subtree, so the
 * keyboard crosses group boundaries as if the groups were not there — the same model
 * `base/select` uses for its Groups.
 */
const props = defineProps<{
  /** The heading to draw, which also names the Group. Give this or `labelledBy`. */
  label?: string
  /** Names the Group from an element elsewhere, and draws no heading. */
  labelledBy?: string
}>()

const headingId = useId()

/**
 * The heading is `aria-hidden` and referenced by `aria-labelledby` rather than read in
 * place, so it is announced once as the Group's name instead of twice — as a stray text
 * node and again as the name. This mirrors `SelectPopup`.
 */
const labelledById = computed(() => {
  if (props.labelledBy) return props.labelledBy
  return props.label ? headingId : undefined
})
</script>

<template>
  <div
    role="group"
    :aria-labelledby="labelledById"
    data-slot="menu-group"
  >
    <!-- group label -->
    <div
      v-if="label"
      :id="headingId"
      aria-hidden="true"
      class="menu-group-label"
      data-slot="menu-group-label"
    >
      <slot name="label">
        {{ label }}
      </slot>
    </div>
    <slot />
  </div>
</template>
