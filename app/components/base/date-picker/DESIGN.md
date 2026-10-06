# DatePicker — design

Why this component is built the way it is. For how to *use* it — props, the typed shapes,
keyboard, a11y — see [README.md](./README.md).

`DatePicker` is the composition layer: `Dropdown` opens and positions, `MaskedInput` takes
text, [`Calendar`](../calendar/DESIGN.md) is the grid. It holds none of those three jobs
itself, which is the same split `base/select/DESIGN.md` already paid for.

## Shape

```
base/date-picker/
  DatePicker.vue      the composition, and the per-period masks
  MaskedInput.vue     an `imask` field with `unmasked` / `masked` / `typed` models
```

`MaskedInput` lives here rather than beside the other form inputs because this is its only
structural consumer — `ColorPallette` and `EditImage` use it through auto-import, as a plain
masked text field with no date knowledge.

## No app-level dependencies

The component formats dates with plain `Date` arithmetic and `quarterIndexOf` from
`base/calendar/utils.ts`. It does not use `$dayjs`, and the separator is a prop rather than
the app's `DATE_SEPARATOR`.

That is not stylistic. `base/` has no imports from app code anywhere, and a base component
reaching for a Nuxt plugin global and an app constant would be the first exception — in
exchange for four `format` calls and one `'.'`. Making the separator a prop also removed a
silent assumption: a reusable date control that hardcodes one locale's separator is
under-specified, not neutral.

## The mask is rebuilt, never reconfigured

`MaskedInput` reads `maskOptions` once, when it mounts. Everything follows from that.

The field carries `:key="`${period}${separator}`"`, so either prop changing remounts it with
a fresh mask. That is the whole mechanism — there is no update path, and adding one would
mean reaching into `imask` state that the composable owns.

It is also why `min` and `max` are absent from the mask options. Two reasons, and the second
is the decisive one:

- `imask` refuses the final character of an out-of-range value, so a valid-but-out-of-bounds
  date shows as `2026.01.0_` while the user is still typing. [ADR-0007](../../../../docs/adr/0007-calendar-never-mutates-its-model.md)
  says the component keeps such a value and shows it rather than correcting it.
- They could not work anyway. A later change to `minDate` would never reach a mask that was
  read at mount. Bounds live in the Calendar, which disables the cells, and in the schema.

## Parsing is by hand, not by `dayjs`

Each period has an explicit `parse`, not `dayjs(text, format, true)`. The app does not load
the `customParseFormat` plugin, and without it strict parsing falls back to `Date`'s lenient
parser, which accepts text that is not a date at all.

The `date` parser also checks its own result:

```ts
const parsed = new Date(year, month - 1, day)
const isReal = parsed.getFullYear() === year
  && parsed.getMonth() === month - 1
  && parsed.getDate() === day
return isReal ? parsed : undefined
```

Without that, `2026.02.31` rolls into 3 March and the field silently agrees with a date the
user did not type.

## The year runs to 9999

The mask accepts 1900–9999 rather than a plausible 1900–2099, because `MaskedInput` syncs its
parsed value back through `v-model:typed`. A capped mask does not merely *show* a larger
year wrongly: it rewrites the model to the cap.

A consumer that uses a sentinel year to mean "no end date" — `DateRangePicker` writes 9999 —
would have its sentinel silently turned into 2099, and its `isUnlimited` check would stop
recognising it on the next load. The cap is a model bug wearing a formatting bug's clothes.

## Focus and the combobox contract

Opening the popover does **not** move focus. The field stays the primary control, the mask
keeps receiving keystrokes, and `ArrowDown`/`ArrowUp` is the gesture that enters the grid —
opening it first if it is shut, so one keypress does both.

The reasoning, and the ARIA that goes with it, is in
[ADR-0005](../../../../docs/adr/0005-calendar-uses-roving-tabindex.md). Three mechanisms here
implement it:

- `manageKeyboard: false` switches off `Dropdown`'s own `ArrowDown` handler and nothing else,
  so `Escape`-to-dismiss still works. Same seam [ADR-0001](../../../../docs/adr/0001-select-uses-aria-activedescendant.md)
  opened for `Select`.
- `role="combobox"` with `aria-haspopup="grid"` and a gated `aria-controls`. `aria-expanded`
  alone is unsupported on the implicit `textbox` role, and `Dropdown`'s blanket
  `aria-haspopup="true"` announces a menu.
- `v-trap-focus.manual` keeps the popover's tab ring without the directive's default grab of
  focus on mount, which is right for a modal dialog and wrong over a field.

Entering the grid waits two ticks: one for the Teleport, one for the Calendar inside it.

## Out of scope

- **Time of day.** `Calendar` has no time support, so a `showTime` prop would do nothing.
  `granularity` is reserved for the react-aria sense of the word.
- **Ranges.** `DateRangePicker` composes two of these and owns the pairing — which end is
  which, and how an end date rounds to the end of its period, is something only the range
  knows. See [ADR-0008](../../../../docs/adr/0008-calendar-period-value-is-the-period-start.md).
- **Locale-aware formatting.** `separator` is one character, not a format string. A real
  locale format would want the field, the mask and the Calendar's labels to agree, which is a
  larger change than a prop.
