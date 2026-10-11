<script lang="ts">
export interface SwitchProps {
  /**
   * The state drawn as text inside the Track, as `{ checked, unchecked }`.
   *
   * Drawn, never announced. `role="switch"` makes its children presentational, so a reader
   * never reaches this text and it cannot name the Switch. See DESIGN.md.
   */
  readout?: { checked: string, unchecked: string }
  disabled?: boolean
}
</script>

<script setup lang="ts">
defineProps<SwitchProps>()

const model = defineModel<boolean>({ default: false })

/*
  Coerced, not passed through. `defineModel`'s default replaces `undefined` and not `null`, and
  Vue drops an attribute whose value is `null` — so a nullable boolean from an API would leave
  `role="switch"` carrying no state at all, which is the defect this component exists to
  remove. See DESIGN.md.
*/
const checked = computed(() => !!model.value)

const attrs = useAttrs()

/*
  `import.meta.dev` is false under vitest and `import.meta.env.DEV` is the true one, so both
  are tested. Both are compile-time literals, so a production build still drops the block.
*/
if (import.meta.dev || import.meta.env.DEV) {
  /*
    A Switch takes its name from the author, never from its content, and a `<label>` cannot
    name a button. So the name has to arrive as an attribute, and nothing else prompts anyone
    to supply one.
  */
  // An empty `aria-label` is ignored by a reader, so it is not a name either.
  const supplied = (attribute: unknown) => attribute !== undefined && attribute !== null && String(attribute).trim() !== ''

  onMounted(() => {
    if (!supplied(attrs['aria-label']) && !supplied(attrs['aria-labelledby'])) {
      console.warn('[Switch] No accessible name. Pass `aria-label` or `aria-labelledby`. The Readout cannot name it.')
    }
  })
}
</script>

<template>
  <button
    class="switch"
    data-slot="switch"
    type="button"
    role="switch"
    :aria-checked="checked"
    :disabled="disabled"
    @click="model = !model"
  >
    <!-- readout -->
    <span
      v-if="readout"
      class="switch-readout"
      data-slot="switch-readout"
      aria-hidden="true"
    >
      <span :class="{ 'opacity-0': !checked }">{{ readout.checked }}</span>
      <span :class="{ 'opacity-0': checked }">{{ readout.unchecked }}</span>
    </span>
    <!-- thumb -->
    <span class="switch-thumb" data-slot="switch-thumb" />
  </button>
</template>

<style scoped>
@reference "#main.css";

/*
  One token drives the geometry: the Thumb, the minimum width and the Readout's size are all
  derived from the height, so `--switch-height: 2.5rem` stays in proportion. Override any of
  them to break the ratio, exactly as `--slider-thumb-size` breaks the Slider's.
*/
.switch {
  --switch-height: 1.5rem;
  --switch-padding: 0.25rem;
  --switch-thumb-size: calc(var(--switch-height) - var(--switch-padding) * 2);
  --switch-min-width: calc(var(--switch-height) * 1.8);
  --switch-track-color: light-dark(var(--color-slate-500), var(--color-slate-600));
  --switch-track-color-checked: var(--color-primary);
  --switch-foreground: var(--color-white);
  --switch-foreground-checked: var(--color-surface);
  --switch-readout-size: calc(var(--switch-height) * 0.42);

  /* What is drawn on the Track. Reassigned by the checked rule below; not a public token. */
  --switch-drawn: var(--switch-foreground);

  position: relative;
  block-size: var(--switch-height);
  min-inline-size: var(--switch-min-width);
  background: var(--switch-track-color);
  transition: background 200ms var(--ease-cubic-out);

  /*
    The Thumb is out of flow, so the padding is what reserves room for it. Swapping which side
    carries the wide value keeps the Readout clear of the Thumb without changing the width:
    both sides always total the same.
  */
  padding-inline-start: var(--switch-height);
  padding-inline-end: var(--switch-padding);

  @apply inline-block cursor-pointer rounded-full;
}

/*
  One declaration decides what is legible against the Track, and the Thumb and the Readout
  both read it. White is right on the unchecked Track and wrong on a bright primary, where it
  measures 1.8:1 — a Thumb nobody can find on the half of the control that matters.
*/
.switch[aria-checked='true'] {
  --switch-drawn: var(--switch-foreground-checked);

  background: var(--switch-track-color-checked);
  padding-inline-start: var(--switch-padding);
  padding-inline-end: var(--switch-height);
}

.switch:disabled {
  @apply cursor-default opacity-60;
}

/*
  An outline rather than the Track's own colour as a glow: a glow in `--switch-track-color`
  disappears against any background that colour sits well on, which is every background anyone
  picks it for.
*/
.switch:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/*
  `inset-inline-start`, not a translate. The travel is "the far end minus my own width", and
  only the inset can say that — the parent's width is not available to `translate`. It buys
  the logical axis for free: there is no `[dir='rtl']` block, because there is no physical
  direction written down.
*/
.switch-thumb {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: var(--switch-padding);
  inline-size: var(--switch-thumb-size);
  block-size: var(--switch-thumb-size);
  background: var(--switch-drawn);
  translate: 0 -50%;
  transition: inset-inline-start 200ms var(--ease-cubic-out), background 200ms var(--ease-cubic-out);

  @apply pointer-events-none rounded-full;
}

.switch[aria-checked='true'] .switch-thumb {
  inset-inline-start: calc(100% - var(--switch-thumb-size) - var(--switch-padding));
}

/*
  Both strings occupy one grid cell, so the Switch is as wide as the longer of them and does
  not resize on toggle. The hidden one still takes part in layout; it is `aria-hidden` on the
  wrapper either way.
*/
.switch-readout {
  color: var(--switch-drawn);
  font-size: var(--switch-readout-size);
  block-size: 100%;
  transition: color 200ms var(--ease-cubic-out);

  @apply grid place-items-center overflow-hidden leading-none font-medium;
}

.switch-readout > span {
  transition: opacity 200ms var(--ease-cubic-out);

  @apply col-start-1 row-start-1 overflow-hidden text-ellipsis whitespace-nowrap;
}

/*
  The house answer, and here it transfers: a Switch that snaps still reports its state. An
  indeterminate Progress Bar is the case where it does not, which is why that component
  answers this query differently.
*/
@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch-thumb,
  .switch-readout,
  .switch-readout > span {
    transition: none;
  }
}
</style>
