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
`aria-disabled`: the stylesheet dims anything carrying it to `opacity: 0.7`, which would dim
every loading button in the application.

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
