# Button — design

Why this component is built the way it is. For how to *use* it — props, slots, icons, loading —
see [README.md](./README.md).

Roughly fifty call sites render this component, and most of them pass only a class and a label.
That reach is the constraint behind every decision below: anything that changes the rendered
geometry or the accessible name is felt across the whole application at once.

## The root is `type="button"`

A `<button>` with no `type` defaults to `type="submit"`, so every one of these was a latent form
submitter. One call site had already worked around it by passing `type="button"` by hand.

The template sets `type="button"` and lets a fallthrough attribute override it, which Vue
resolves in the caller's favour. A form submit button therefore stays one word away, and the
dangerous behaviour is the one you have to ask for.

## The click guard reads `aria-disabled`, and only `"true"`

Native `disabled` removes a button from the tab order, which is wrong for a control that should
stay discoverable while unavailable. Callers use `aria-disabled` instead, which keeps the button
focusable — and therefore still firing `click`. The component has to drop that event itself.

The value is read inside the handler rather than in a computed, because `useAttrs()` is current
but does not track: a computed over it never invalidates and would answer with whatever the
attribute said at setup.

Only `true` and `"true"` count. This is a contract with
[`button.css`](../../../assets/css/components/button.css), which suppresses the hover and active
states with `:not([aria-disabled="true"])`. A bare `aria-disabled` renders as `""` and matches
neither, so the two agree. Treating `""` as disabled was tried and reverted: it produced a
button that looked fully enabled and silently dropped every click.

## The live region stays mounted

A screen reader announces text added to a live region it already knows about. A region inserted
into the DOM with its text already in place is commonly missed, so rendering the message with
`v-if="loading"` announced nothing.

The `sr-only` span is therefore always present and holds an empty string while idle. It is
`position: absolute`, so it is out of the button's flex flow and costs no layout.

This also carries the accessible name. The content wrapper takes `invisible` while loading,
which is `visibility: hidden` and removes it from the accessibility tree, so the button's name
becomes `loadingMsg` for that period and reverts afterwards. Loading deliberately does not set
`aria-disabled`: the stylesheet dims anything carrying it to `var(--opacity-disabled)`, which
would dim every loading button in the application.

## Hover is gated on a pointer that can hover

Every hover rule in [`button.css`](../../../assets/css/components/button.css) sits inside
`@media (hover: hover)`. Without it a tap latches `:hover` on a touch screen, and the button
keeps a hover tint until something else is tapped. A ToggleButton makes that visible: a latched
tint on an unpressed toggle is the weak form of the pressed fill, so the stale cue and the state
cue become the same kind of signal.

`:active` is left outside the query, because a press is a press on every pointer. The query does
not change specificity either, so the source order that keeps the pressed fill ahead of the ghost
tint still decides.

## A press scales, and the scale is composited on purpose

A press takes the button to `0.96` and releases over 150ms. The first version transitioned the
scale and nothing else, which was enough to make a ghost button two rows below flicker on every
mousedown: a compositable animation pulls the pressed button into its own layer for the length
of the animation, and everything painting after it in the same stacking context is re-grouped
into a layer of its own. A fresh layer with no opaque background behind it cannot use subpixel
antialiasing, so its text re-rasterizes grayscale and snaps back on release.

No overlap is needed for that — paint order inside one stacking context is enough, and
`initial:relative` on every button in [`Button.vue`](./Button.vue) puts all of them in the
root's positioned-descendants phase as a single chunk. The ghost variants show it because they
have no background of their own.

`will-change: scale` settles it by making the layer permanent, so mousedown changes nothing in
the layer tree. Three consequences are worth knowing:

- **Every button that can scale holds a layer.** The hint carries the same guards as the scale
  itself, so a disabled button, a `btn-static` one, and every button under
  `prefers-reduced-motion: reduce` stay unpromoted. The rest do not. 90 buttons measured
  325,036 px², which is about 1.24 MB of layer backing at dpr 1 and 4.96 MB at dpr 2. A screen
  with a button per table row is the one to measure before trusting this.
- **A promoted button is a stacking context and a containing block for `position: fixed`
  descendants.** Nothing in the component depends on escaping either — the loading spinner is
  absolute and already contained, and a Tooltip teleports to `body` — but a consumer who puts a
  fixed-position element inside a button will find it trapped.
- **Button labels render with grayscale antialiasing from now on**, not only while pressed.
  That is why the flicker is gone: the state that used to arrive at mousedown is now the
  resting state.

## Icon spacing uses logical margins, not a translate

The original nudge was `translate-x-1/4`. CSS `translate` has no logical form, so under
`dir="rtl"` it pushed the icon into the label instead of away from it: the measured gap fell
from 4px to 0.5px. It also shifted the icon without reserving space, eating 3.5px of the
button's 17px trailing padding in **both** directions.

`me-1`/`ms-1` opens the gap on the inline axis and reserves what it uses, which fixes the
reversal and the padding at once. There is no `[dir='rtl']` block, because no physical direction
is written down — the same reasoning as the Switch thumb's `inset-inline-start`.

The negative `-ms-1`/`-me-1` trims the padding on the icon's own side, because a glyph carries
its own whitespace and leaves that side looking over-padded. It rides on the icon rather than on
a `.btn:has()` rule so that it composes with every size: the size classes own the padding, and a
margin only ever takes one step off whatever they set. A `:has()` rule would have to restate a
value per size, or the stylesheet would have to move padding into a custom property first.

## Two icon props instead of a position enum

`icon` renders before the label and `trailingIcon` after it. An `icon` plus an `iconPos` enum
was the obvious alternative and cannot express a button that carries both at once — a leading
glyph with a trailing disclosure chevron is a real pattern, and an enum has no way to say it.

Leading is the default because that is what the call sites wanted: of the seven that pass an
icon beside a label, six use a glyph that restates the action (check, plus, trash) and one uses
a rotating chevron. A dead `icon-pos="right"` attribute at one call site, which was never a prop
and fell through to the DOM, is what the trailing prop now states properly.

## Known limitations

**The label moves when an icon appears on an over-wide button.** The content is centred, so on a
button wider than its content the label shifts by half the icon's footprint — about 8px on a
`w-40` button. An auto-width button does not move.

`justify-start` removes the shift only for a trailing icon, where the label already sits against
the leading padding. For a leading icon it doubles the shift, because the icon then
occupies the space between that padding and the label. Anchoring a leading-icon label would mean
reserving the icon's width while it is absent, which widens every button that never has one.
That was judged worse than the shift, so it is left to call sites that care.
[`playground/button.vue`](../../../pages/playground/button.vue) has all four combinations
side by side.

**Icons passed through the default slot get neither margin.** The slot replaces the fallback
entirely, so slot children are spaced only by `gap-1` — 4px rather than the 8px prop icons get,
and with no padding trim. The margins cannot reach slot content without a wrapper that would
change the layout for every other slot user.

**A trim assumes the button has padding to trim.** On a button with `px-0`, a labelled icon's
negative margin pulls it outside the content box. No call site does this today.

## Out of scope

**Appearance.** There is no variant or size prop. Colour, border and padding belong to the
`btn-*` classes in [`button.css`](../../../assets/css/components/button.css), so a plain
`<button class="btn btn-primary">` styles identically and the component stays free of a
duplicate class map.

**Link rendering.** This always renders a `<button>`. Use `NuxtLink` with `class="btn"` for
navigation, which keeps link semantics instead of faking them.
