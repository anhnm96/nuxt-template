<script setup lang="ts">
import type { CalendarDay } from './useCalendar'
import { injectCalendarContext } from './context'

const props = defineProps<{ day: CalendarDay }>()

const ctx = injectCalendarContext()
const buttonRef = useTemplateRef('buttonRef')

/**
 * Real DOM focus follows the roving tabindex, but only when the move came from the
 * keyboard. `focusRequest` is bumped by keyboard handlers alone, so paging driven by the
 * model or by the parent never yanks focus away from whatever the user was using.
 *
 * `isTabbable` is read *after* `nextTick`, so the check sees this render's props rather
 * than the previous ones.
 */
async function focusIfClaimed() {
  await nextTick()
  if (!props.day.isTabbable) return

  // Claim only once we know we can act on it. This callback is deferred, so a cell can be
  // unmounted by the time it runs — the outgoing cell of a month page is, and it still
  // reports the `isTabbable` it had before the page. Claiming there would burn the token
  // and leave the incoming cell unable to take focus at all.
  const button = buttonRef.value
  if (!button?.isConnected) return
  if (!ctx.calendar.claimFocusRequest()) return

  button.focus()
}

watch(() => ctx.calendar.focusRequest.value, focusIfClaimed)

/**
 * The watcher alone is not enough: a cell that did not exist when the request was made
 * never sees it. `PageDown` to a day outside the current grid, and `Escape` back out of a
 * panel (which re-creates the whole grid), both land here — without this, `tabindex="0"`
 * moves correctly while DOM focus falls to `<body>`.
 *
 * The claim token is what keeps this safe. On first mount no request has been made, so the
 * Calendar does not steal focus on render; and paging with the mouse mounts new cells
 * without bumping the counter, so focus stays on the nav button being clicked.
 */
onMounted(focusIfClaimed)
</script>

<template>
  <td
    role="gridcell"
    :aria-selected="day.isSelected || undefined"
    class="p-0 text-center"
  >
    <button
      ref="buttonRef"
      type="button"
      class="calendar-cell"
      :disabled="day.isDisabled"
      :aria-disabled="day.isUnavailable || undefined"
      :aria-label="day.label"
      :tabindex="day.isTabbable ? 0 : -1"
      :data-selected="day.isSelected || undefined"
      :data-today="day.isToday || undefined"
      :data-outside="day.isOutside || undefined"
      :data-unavailable="day.isUnavailable || undefined"
      @click="ctx.calendar.select(day.date)"
    >
      <slot :day="day">
        {{ day.dayOfMonth }}
      </slot>
    </button>
  </td>
</template>

<style scoped>
@reference "#main.css";

/*
  One signal per concept (see DESIGN.md):
  ring = Selected · bold+primary = Today · focus outline = Active · opacity = Outside
  muted + dead hover = Disabled · strikethrough = Unavailable

  Outside and Disabled must not look alike — they behave oppositely. The hover response is
  the discriminator: an Outside Day responds, a Disabled Day does not.
*/
.calendar-cell {
  @apply relative flex items-center justify-center rounded-full;
  @apply transition-colors;
  @apply hover:bg-list-item-bg;

  /*
    Derived from `--calendar-cell`, never hardcoded. The column is `var(--calendar-cell)`
    wide, so a fixed button size silently overflows its own column the moment a consumer
    narrows the token to fit a sidebar — which is exactly what the token is documented for.
  */
  width: calc(var(--calendar-cell) - var(--calendar-cell-gap));
  height: calc(var(--calendar-cell) - var(--calendar-cell-gap));
  margin: calc(var(--calendar-cell-gap) / 2);

  /*
    Selected and Active must not look alike, and a solid primary outline *is* what Selected
    looks like. They are separated on three axes at once, so neither reads as the other:

      Selected  1px, full opacity, ON the circle's edge
      Active    2px, translucent, detached from it by a 2px gap

    The gap is what lets a cell that is both show both rings at once — with the ring drawn
    flush, they merge into one thick band and the cell just looks emphatic.

    Translucent rather than dashed: at 32px a dashed 2px outline resolves into four or five
    stubs that read as a rendering artefact, and dashed borders already mean "drop target"
    or "empty placeholder" elsewhere. Kept at 55% rather than the 25% Nuxt UI uses, so the
    indicator still clears WCAG 2.2 Focus Appearance against the surface behind it.

    `--calendar-cell-gap` is 0.5rem rather than the 0.25rem this started with: the halo
    extends past the circle, and at the tighter spacing it collided with the neighbouring
    cell's button.

    Drawn on a pseudo-element rather than as `outline-primary/55`. Tailwind's alpha modifier
    resolves to **white** here, because `--color-primary` is a `light-dark()` value that
    `color-mix` cannot take apart — a silent failure that looks like a deliberate white ring.
    Plain `opacity` works on any colour function, and it lets the glow fall off with it.
  */
  &:focus-visible {
    @apply outline-none;
  }

  &:focus-visible::after {
    content: '';

    @apply pointer-events-none absolute -inset-[3px];

    border: 2px solid var(--color-primary);
    border-radius: inherit;
    box-shadow: 0 0 6px 1px var(--color-primary);
    opacity: 0.6;
  }

  &[data-outside] {
    @apply opacity-50;
  }

  &[data-today] {
    @apply font-semibold text-primary;
  }

  &[data-selected] {
    @apply text-primary ring-1 ring-primary;
  }

  &[data-unavailable] {
    @apply cursor-default text-muted line-through;
  }

  &:disabled {
    @apply cursor-default text-muted opacity-100 hover:bg-transparent;
  }

  /* A value we refuse to strip (ADR-0007) can be selected and out of bounds at once. */
  &:disabled[data-selected] {
    @apply text-muted ring-muted;
  }
}
</style>
