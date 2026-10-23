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

For a standalone Tooltip, `modelValue` decides whether the teleported container exists; `isVisible` drives the inner
`<Transition>`. Closing flips `isVisible` first, and `modelValue` falls only in
`@after-leave`. So the leave animation plays, and the container keeps its Floating UI
position until the leave animation has finished. The cost: `update:modelValue` reports `false` late, and while
the leave is running the surface is still in the DOM (tests and scripts must check for
`tooltip-leave-active`, not just presence).

## Grouped motion keeps content ownership local

`TooltipHost` renders one `TooltipGroupSurface` per active group. The coordinator is scoped
to the Vue app through a WeakMap, so requests and separate apps do not share live Anchors.
The host belongs in the app shell; group names are app-wide rather than scoped by a wrapper.

Each Tooltip teleports its own slot into a host-owned target. The host never invokes another
component's slot. This preserves provide/inject ancestry and reactive slot content. Targets
are keyed by member identity, with at most a current and outgoing layer. Reclaiming an
outgoing member cancels its cleanup; discarding it completes its model before the next fade.

The positioned wrapper survives handoffs. Its inner surface uses `v-show` so even a handoff
during the leave transition reuses the same DOM element. Close callbacks carry a revision;
callbacks from an earlier close cannot dispose a reopened group. The outgoing description
is hidden from accessibility APIs immediately, while its visual fade can finish.

The 100ms pointer handoff interval is separate from the 300ms Sweep window. Sweep skips an
entrance; a grouped handoff animates an existing surface. A group's mere existence skips the
pointer delay only for members of that group, never for unrelated tooltips. Focus keeps its
delay and touch never morphs. Unsupported rendering modes keep the standalone path.

Positioning measures the destination surface with its classes, inline width constraints,
and padding, then supplies those dimensions to Floating UI. Measurement temporarily removes
the live surface's wrapper-filling dimensions and restores them synchronously before paint.
Each content layer keeps its own measured width. Incoming text wraps at the destination width
immediately; outgoing text keeps its previous width until removal. The viewport clips the
layers as the surface resizes, so intermediate surface widths cannot change line breaks.
Measurement releases only the current layer's width synchronously before measuring again,
so reactive content and viewport changes still produce fresh dimensions. Removed layers
release their stored widths.
The active layer also observes text changes and child replacements. A pinned box can keep
the same width and height when its text changes, so a resize observer alone cannot trigger
fresh measurement. Style-only writes from measurement are excluded from this mutation
observer; they must not cause a measurement loop. Both observers disconnect on handoff.
The positioned wrapper, not its relative inner surface, is the
floating element. Only a member change transitions geometry; scroll and resize updates snap
to their corrected placement. Content opacity changes independently, so text is never scaled
to imitate a width change. `animate` remains the entrance/exit contract.

While a grouped member is visible, a document child-list observer checks whether its Anchor
remains connected. External `target` elements can disappear without unmounting their Tooltip;
that removal begins closing immediately and follows the normal model cleanup lifecycle.
The observer disconnects when the member deactivates or its Tooltip unmounts.

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

## Sweeping skips the delay and the animation

Explicit grouped dismissal bypasses the handoff wait. Standalone tooltips retain an
existing hide deadline when Escape, a click, or disabling requests another close; repeated
requests do not restart `hideDelay`.

A pointer moving along a row of Anchors is already reading tooltips. Making it wait `delay`
again at each one, or fading each hint in behind the one it replaces, only adds lag. So a
Tooltip opened during a Sweep skips both.

Within a Tooltip Group, this skips an entrance but does not suppress the handoff motion
of an existing shared surface. The grouped lifecycle is described above.

One condition drives both halves, and that is deliberate: a Tooltip that appeared instantly
but faded out, or that waited its delay and then snapped in, reads as a glitch.

**The window is keyed off an Anchor being left, not off a Tooltip being open.** This is the
part worth keeping. "Something is open" is also true of a Tooltip pinned open across the
page — through `v-model`, or an Interactive Tooltip the user has not dismissed — and keyed
off that, one pinned Tooltip makes every Tooltip on the page instant for as long as it
stays up. Keyed off leaving, the window closes by itself as soon as the pointer stops
moving. `SKIP_WINDOW_MS` in `~/stores/tooltip` holds the duration.

The mark is written in `hide()`, before the hide timer, rather than in `conceal()`. The next
Anchor is usually entered in the same task, so a mark written at unmount lands after the
open that needed to read it.

Three opens never count as sweeping:

- A **touch press**. The Tooltip that just closed may be the one this very press is
  dismissing, so skipping would flash a peek on every quick tap.
- A **Tap** and a **`v-model`** open. Both are reached deliberately rather than swept past.
- A **focus**. Tab is discrete, not swept. It is also the one open that has to stay
  cancellable — a tap on the Anchor cancels a focus-started show, and there is nothing to
  cancel once the delay has been skipped. `show()` tells these apart by whether it was
  given an event; the focus listener passes none.

`isContinuingSweep` also refuses a negative elapsed. A system clock adjustment can move the
clock back behind the mark, and without that guard the window would stay open until the
clock caught up.

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
