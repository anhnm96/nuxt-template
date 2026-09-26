# Tooltip — design

Why this component is built the way it is. For how to *use* it — props, slots, the input
table — see [README.md](./README.md).

Tooltip is auto-registered without a path prefix and used across tiptap toolbars, the
inquiry pages and the schedule's `EventTooltip`. `EventTooltip` sits inside four
event components (`WeekEventBlock`, `WeekAllDayBar`, `TimelineEventBar`, `TimelineDay`) that
are also drag handles, so touch handling has to coexist with a gesture it doesn't own.

## One component for both modes

An Interactive Tooltip is a Tooltip with `interactive`, not a separate component — see
[ADR-0004](../../../../docs/adr/0004-interactive-tooltip-is-a-mode-of-tooltip.md). The two
modes differ only in their *policy*: ARIA (description or preview), and what a touch does
(peek or Tap). Placement, the arrow, delays, the hover bridge, Escape and the lifecycle are
shared. `followCursor` is the one prop that doesn't combine with `interactive`: a tooltip
under the cursor can't be clicked. It is ignored with a dev-mode `console.warn` rather than
made unrepresentable in the types.

## Two flags for open: `modelValue` mounts, `isVisible` shows

`modelValue` decides whether the teleported container exists; `isVisible` drives the inner
`<Transition>`. Closing flips `isVisible` first, and `modelValue` falls only in
`@after-leave`. So the leave animation plays, and the container keeps its Floating UI
position until the leave animation has finished. The cost: `update:modelValue` reports `false` late, and while
the leave is running the surface is still in the DOM (tests and scripts must check for
`popover-leave-active`, not just presence).

## Touch listens on the window, not the Anchor

`useTouchPress` only needs the press to *start* on the Anchor. It hears that press in the
capture phase, so a child that stops `pointerdown` (the schedule's resize handles do) is still
part of the Anchor. Its move, release and cancel are watched on `window` in the capture phase. The Anchor is often a drag handle whose own
code may `preventDefault`, stop propagation, or (in future) capture the pointer. Watching
the window means the Tap/drag decision never depends on what the Anchor does with the press.

`TAP_SLOP_PX` is 4 — the schedule grid's `dragThresholdPx` default. If the Tap slop were
larger than an Anchor's drag threshold, a press that travelled between the two would move
the event *and* open its tooltip.

## A Tap cancels the click, at the window

On touch, a Tap opens an Interactive Tooltip *instead of* activating the Anchor. Browsers
follow the Tap with a synthetic `click`. `preventNextClick` cancels it with a one-shot
`window` capture listener, which runs before any listener on the Anchor or inside it. So the
consumer's `@click` never needs a `pointerType` check. The listener is disarmed by the next
`pointerdown` or after 1s. A Tap whose click never arrives therefore can't eat a later
keyboard-activated click.

Stopping the click at the window also hides it from page-level listeners that have nothing to
do with the Anchor. The app's `v-click-outside`, for example, listens on `document.body`, so an
open Dropdown would stay open when you Tap an event. So after cancelling it, `preventNextClick`
dispatches a copy of the click from `document.body`, with `target` overridden to report the
original element. Outside-click detectors compare `target`, so they judge the Tap by where
it really happened. Ancestors between the Anchor and body don't get the copy, because those
are the ones that might *activate* on it (a grid row that creates an event on click). The
cost is that the copy is untrusted (`isTrusted` is false), and a document-level *delegated*
click handler would see it as a click on the Anchor.

This is also why the Anchor's own `click → hide` doesn't close a Tap-opened tooltip. That
click is stopped before it reaches the Anchor. That listener is in the capture phase, so a
child that stops the click can't keep a plain tooltip open.

## Touch presses never skip the show delay

`delay` is skipped while another tooltip is showing, because moving between tooltips is
already a tooltip-reading gesture. A touch press is excluded. The tooltip that is still
counted as showing may be an Interactive Tooltip that this same press is closing (it leaves
the store only when its hide timer fires). Skipping the delay would then flash a plain
tooltip's peek on every quick tap.

## Outside presses close, but pass through

While an Interactive Tooltip is open, a capture-phase `pointerdown` on `document` closes it
unless the press is inside the Anchor or the tooltip. It is not cancelled. A press on another
event's Anchor therefore closes this tooltip *and* Taps that Anchor, which opens its own.
Swapping between events takes one Tap. Pressing the empty grid closes the tooltip and still
reaches the grid.

The same listener records whether a press started inside the tooltip. The Anchor's `blur`
handler checks that record. On Android, tapping a button in the tooltip moves focus off
the Anchor, and without the check that blur would close the tooltip before the button's click lands.

## Known limitations

- **Escape stops at the first open tooltip.** `stopImmediatePropagation` keeps Escape from
  also closing a dialog behind the tooltip. It also means that with two tooltips open (a
  hover tooltip plus a Tap-opened one), one Escape closes only one of them. Fixing it would
  need a shared dismissal stack rather than per-tooltip `document` listeners.
- **Interactive Tooltips are not keyboard-reachable.** This was decided, not an accident (see
  the ADR). Consumers must expose every action through the Anchor.
- **Listeners attach one flush after mount.** The Anchor is found in `onMounted`, and
  VueUse binds to it in a post-flush watcher. A `pointerdown` dispatched synchronously after
  `mount()` is missed, which only a test can do.

## Out of scope

- **Click-to-open menus and pickers:** use `Dropdown`, which has focus management and
  `aria-expanded`.
- **Transient feedback like "Copied!":** a toast. A `v-model` Tooltip works, but it closes as
  soon as the pointer leaves.
