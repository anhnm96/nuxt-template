# ToggleButton — design

Why this component is built the way it is. For how to *use* it — the two binding forms, naming,
styling — see [README.md](./README.md).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md).

## Purpose

A Toggle Button is a Button plus one attribute, and almost none of this is about behaviour. It
is about the three ways that attribute goes wrong quietly: never arriving, disagreeing with the
name beside it, or disagreeing with the consumer that owns the state. All three draw correctly
on screen, which is why they are designed out rather than written down as a warning.

The choice of pattern — a fixed name reporting `aria-pressed`, rather than a button that
renames itself — is recorded in
[ADR 0013](../../../../docs/adr/0013-toggle-button-reports-state-through-aria-pressed.md),
together with what that rules out.

## It wraps Button rather than repeating it

[Button](../button/Button.vue) already owns `type="button"`, the `aria-disabled` click guard,
the loading live region and the logical icon margins. A Toggle Button needs every one of them
and adds one attribute, so it composes instead of copying: re-implementing the click guard is
how the two would drift, and the guard is the part whose failure is silent.

Button exports `ButtonProps` for this, the way the repo's other wrapped components export their
props type. The wrapper declares that type and forwards it with `v-bind="props"`, so a consumer
keeps `label`, `icon` and the rest typed rather than passing them as untyped attributes.

The default slot is forwarded only when a consumer fills it. An always-forwarded slot counts as
content, which would discard Button's own icon fallback for every call site.

## The consumer keeps the truth

The state a toggle reports is usually not its own. The consumer that prompted this binds
`editor?.isActive('bold')`: the editor answers after the command runs, and the command can be
refused — bold inside a code block. A button that wrote its own state optimistically would draw
pressed over a document that is not.

So a click writes the model and the render still reads the prop. `defineModel` gives exactly
that when a consumer binds both `model-value` and the listener: the local value is left alone
and only the event is emitted. [ToggleButton.spec.ts](./ToggleButton.spec.ts) pins it, because
it is a behaviour of Vue's implementation rather than of this file, and nothing else here would
fail if it changed.

Binding `model-value` alone is the hole in that contract: with no listener the component falls
back to its own state and drifts from the value that was passed. The README names it; it is not
designed out, because a prop with no listener is also how a deliberately uncontrolled button
with an initial value is written.

The attribute is rendered from `!!model`, not from the model. `defineModel`'s default replaces
`undefined` and not `null`, and Vue removes an attribute whose value is `null`, so a consumer
binding a nullable source would hand back a button with no `aria-pressed` at all — announced as
a plain button, drawn exactly like an unpressed one.

## The name holds still

`aria-pressed` carries the state, so the name must not. A name that moves with the state
announces it twice and the two halves disagree: at the moment "Unmute" is the name,
`aria-pressed` is `false`, and a reader hears an unpressed control offering to undo something.

Nothing in the markup prompts anyone to supply a name at all, and the seven toolbar toggles
this component replaced had none — an `<Icon>` and a `<Tooltip>`, which sets `aria-describedby`
and exists only while open. Hence two dev warnings: one when no name arrives, one when a
supplied name changes.

The second is checked in `onUpdated` rather than a watcher. `useAttrs` is current but does not
track, so `aria-label` cannot be watched, and the name may arrive through either an attribute
or a prop. A name arriving *late* — `undefined` then "Bold" — is not a change and does not
warn.

## The state is styled from the attribute that announces it

`button.css` selects on `[aria-pressed='true']`. There is no class or `data-state` mirroring
it, because a mirror is a thing that can fall out of date, and out of date here means drawn on
and announced off.

Pressed promotes a ghost variant to the solid treatment of its own accent rather than setting
one fixed colour. The stylesheet is a token contract — a variant declares its colours and the
shared rules read them — so a rule that hardcoded the primary would render `btn-text-error`
identically pressed and unpressed, and would paint primary text on a primary fill for
`btn-primary`.

Those rules repeat the two disabled guards and sit after the ghost region. The ghost hover rule
matches with the same specificity, so source order is what stops a hover from washing the fill
back to a tint.

A solid variant needs a second rule, and the reason is contrast rather than colour. Its label is
`--color-surface`, which is slate-900 in dark mode, so deepening the fill there put dark text on
a dark fill: measured 2.78 to 3.61 across the severities, where the same buttons read 4.69 to
10.04 unpressed. The five fixed hues therefore turn the label white, which the deepened steps
carry in both themes — 4.95 and above. `btn-neutral` is excluded, because its accent inverts
with the theme and white on its deepened fill measures 1.23; the surface colour it already uses
gives 14.48 and 10.35.

## The pressed fill moves with the theme

A ghost variant's pressed label is `--color-surface`, which is white in light mode and
slate-900 in dark. One fill cannot carry both, so `--btn-pressed-fill` is a `light-dark()`
pair: light mode takes the 700 step the white label needs, dark mode takes the 500 step the
slate-900 label needs. Filling both themes from the 500 step measured 2.22 for
`btn-text-primary` and 3.81 for `btn-text-error` in light mode. `btn-text` and `btn-outline`
declare no 700, and their muted accent already measures 4.76 light and 6.96 dark, so the
fallbacks leave them where they were.

Hover and active do not pick a further step. They mix the fill toward `--btn-pressed-away`,
which is the opposite of the label: `--color-surface-inverted` for a ghost, `--color-black`
for a solid variant whose label is white. Moving away from the label is what makes the two
states raise contrast in both themes rather than one. Deepening a ghost on hover in dark mode
used to drop it to about 2.9.

Every pressed pair this component renders measures 4.69 or better at rest, and higher on hover
and on active. The tables are every variant `button.css` declares, as rest → hover → active,
measured under the `green` primary that `app.config.ts` ships.

A ghost variant takes its pair from its accent, so `btn-text-info` and `btn-outline-info`
measure the same: both fill from one accent and both label with the surface color.

| Ghost accent | Light | Dark |
| --- | --- | --- |
| muted (`btn-text`, `btn-outline`) | 4.76 → 5.93 → 7.21 | 6.96 → 8.12 → 9.30 |
| primary | 4.95 → 6.15 → 7.49 | 10.04 → 11.04 → 11.97 |
| info | 5.86 → 7.10 → 8.50 | 6.60 → 7.68 → 8.85 |
| success | 4.95 → 6.15 → 7.49 | 8.05 → 9.07 → 10.18 |
| warn | 5.22 → 6.43 → 7.74 | 6.18 → 7.27 → 8.41 |
| error | 6.42 → 7.79 → 9.04 | 4.69 → 5.85 → 6.99 |

Primary matches success above only because the shipped primary is green. It is the one row
that moves: `app/plugins/theme.ts` writes `app.config.ts`'s colour to `data-theme`, and
`localStorage['nuxt-ui-primary']` repoints the whole ramp at runtime. Under the stylesheet's
own `:root` fallback, which is indigo, the ghost reads 7.55 → 8.82 → 10.00 light and
6.58 → 7.80 → 8.97 dark. Measure again after changing the theme; no other row depends on it.

A solid variant labels in white and fills from the 700 step in both themes, so one column
covers both.

| Solid | Light and dark |
| --- | --- |
| `btn-primary` | 4.95 → 6.97 → 9.43 (indigo: 7.55 → 10.04 → 12.63) |
| `btn-success` | 4.95 → 6.97 → 9.43 |
| `btn-info` | 5.86 → 8.12 → 10.67 |
| `btn-warn` | 5.22 → 7.36 → 9.91 |
| `btn-error` | 6.42 → 8.76 → 11.39 |

`btn-neutral` belongs to neither: it labels with the surface color and moves its own way per
theme — 7.58 → 8.84 → 10.01 light, 6.96 → 8.12 → 9.30 dark.

One thing the numbers do not show: in light mode a pressed `btn-text` holds the muted 500 step
while a pressed `btn-text-error` holds red 700, so the grey one reads lighter than its coloured
neighbours. Both pass, and moving the grey one to slate-700 would make a pressed toolbar button
nearly black.

## Neutral has nowhere to deepen

Every other variant reports Pressed by moving its fill one step further from the page.
`btn-neutral` cannot: unpressed it already holds `--color-surface-inverted`, which is the
darkest step in light mode and the lightest in dark. Deepening it moved slate-900 to slate-700
and white to slate-200, and the two fills then measured 1.68 and 1.17 apart — near enough to
read as one colour.

Pressed therefore moves two steps toward the middle instead of one, to slate-600 in light and
slate-400 in dark, which puts the two fills 2.36 and 2.56 apart. The border stays on the
unpressed accent, so a pressed neutral button carries a rim of the colour it holds unpressed.
The rim is what names the difference; the fill alone is only a shade.

## Deliberately not built

- **`aria-pressed="mixed"`.** Valid ARIA, and no consumer here can produce it: tiptap's
  `isActive` collapses a mixed selection to `false`. It would widen the model to
  `boolean | 'mixed'` for everyone, to report a state nothing can reach.
- **A toggle group.** An exclusive row — [`EditImage.vue`](../../konva/EditImage.vue)'s tool
  picker — has one value for the set, so each member reporting its own pressed state
  misdescribes it. That is a radio group, with its own keyboard contract.
- **A renaming mode.** The other pattern, and it needs no component: a plain Button with a
  computed label. [SwapButton](../swap-button/SwapButton.vue) is the version with several
  states.
- **A `severity` or `size` prop.** Every `btn-*` class composes with this component already.
