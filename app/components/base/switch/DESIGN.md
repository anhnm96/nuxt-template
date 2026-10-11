# Switch — design

Why this component is built the way it is. For how to *use* it — props, the Readout, styling
— see [README.md](./README.md).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md).

## Purpose

A Switch has two states and no arithmetic, so almost none of this is about behaviour. It is
about the two ways a switch goes wrong quietly: reporting its state to the screen but not to a
reader, and taking its name from the wrong place. Both are invisible in review, which is why
they are designed out rather than written down as a warning.

## The state lives in one attribute

`role="switch"` requires `aria-checked`. `aria-pressed` belongs to `role="button"` and is
ignored here, so a switch that reports through it is drawn correctly and announced as nothing
at all.

The stylesheet selects on `[aria-checked='true']` — the same attribute a reader reports. There
is no `data-state` mirroring it, because a mirror is a thing that can be out of date, and
being out of date is the whole failure: right on screen, silent to a reader.

That attribute is rendered from `!!model`, not from the model. `defineModel`'s default
replaces `undefined` and not `null`, and Vue removes an attribute whose value is `null`, so a
consumer binding a nullable boolean — an API flag that has never been set — would hand back a
`role="switch"` with no `aria-checked` on it. The same failure, arriving through the model
instead of through the template.

## The name cannot come from inside

`role="switch"` inherits from `checkbox`, which is children-presentational and takes its name
from the author. Text rendered inside is dropped from the accessibility tree and never
contributes a name, and a `<button>` cannot be named by a `<label>` either. So the name has to
arrive as `aria-label` or `aria-labelledby`.

Nothing in the markup prompts anyone to supply one, and an unnamed switch announces as a bare
"switch". Hence the dev warning. A `label` prop would be the other way to prompt it, and it is
the worse way: a prop called `label` reads as the accessible name, so it invites being passed
to `title` — which names the control after its own state.

## The Readout, not a label

The visible `ON` / `OFF` text is a Readout, the term the Progress Bar uses for the same
contract: state drawn as text inside a control that a reader never hears. Giving the two the
same name makes the shared rule visible — if you want it announced, say it again where ARIA is
listening.

Both strings stay in the layout, stacked in one grid cell with the inactive one transparent. A
Switch that is as wide as `ON` and then as wide as `OFF` moves whatever sits next to it every
time it is toggled.

## Styling is custom properties, not props

Colour and size arrive as `--switch-*` properties. A prop whose only effect is to write a CSS
variable onto the root buys nothing, and costs a reactive declaration, a `:style` binding and
a fallback expression per value.

The prefix is not decoration. Custom properties inherit, so an unprefixed `--height` or
`--active-color` on the root reaches every descendant and collides with anything else using
that name nearby.

Four of the nine are derived from `--switch-height`, so one override keeps the proportions,
the way `--slider-thumb-size` derives from the Slider's Track height.

The colours are two pairs rather than four names, because the question they answer is one
question. A single unconditional foreground cannot serve both states: white is right on the
unchecked Track and measures 1.8:1 against the configured theme's primary in dark mode, which
leaves the Thumb invisible on exactly the half of the control where its position is the only
state cue. So a Track colour and the foreground drawn on it are set together.

`--switch-foreground-checked` follows `.btn-primary`'s `--btn-color: var(--color-surface)`
rather than inventing a token the repo does not have. That fixes dark mode and **does not fix
light mode**, where `--color-surface` is white and the primary is still a light green: 2.2:1,
the same number `.btn-primary` renders its own label at. The right place for that is the
theme's `--color-primary`, not nine components each picking a different escape. A Switch that
cannot wait sets `--switch-foreground-checked` itself.

The Thumb and the Readout share that one foreground through an internal `--switch-drawn`,
reassigned once by the `[aria-checked='true']` rule. Two consumers, one decision, and the
decision sits next to the Track colour it has to survive.

## The Thumb travels on an inset, not a translate

A translate would be composited and an inset is not, so the inset wants an argument.

The travel is "the far end of the Track, minus my own width" — and the Track's width is not
available to `translate`, whose percentages resolve against the moving element itself. It is
available to `inset-inline-start`, where `100%` is the containing block.

That buys the logical axis for free. Animating `left` instead would need a `[dir='rtl']` block
re-declaring the transition on `right` and mirroring the offset; naming no physical direction
means there is no `[dir]` override at all. One small element doing layout once per toggle is
not a cost worth a direction bug.

The focus ring is an outline rather than a glow in `--switch-track-color`. A glow in the
Track's own colour disappears against every background that colour was chosen to sit on.

## Deliberately not built

- **A `change` event.** It would fire in the same statement as `update:modelValue`, with the
  same payload. The Slider keeps one because there it means "the gesture ended", which is a
  different moment.
- **`aria-disabled` as an alternative to `disabled`.** A Switch that stays focusable while
  inert needs a reason, and no consumer has one.
- **A `size` or `severity` enum.** `--switch-height` takes any length and
  `--switch-track-color-checked` any colour, including the ones an enum would not have.
- **Form participation.** The root is a `<button>`, so a Switch does not post a value. Every
  consumer reads `v-model`.
- **A `.story.vue` file.** Histoire is not a dependency. Variants live at
  `pages/playground/switch.vue`, which runs.
