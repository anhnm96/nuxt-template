# Select — design

Why this component is built the way it is. For how to *use* it — props, slots,
keyboard, a11y — see [README.md](./README.md).

Terms in Title Case are defined in
[CONTEXT.md](../../../../CONTEXT.md). Architectural rationale lives in
[ADR-0001](../../../../docs/adr/0001-select-uses-aria-activedescendant.md) and
[ADR-0003](../../../../docs/adr/0003-select-handles-both-modes-in-one-component.md), which supersedes
[ADR-0002](../../../../docs/adr/0002-select-and-multiselect-are-separate-components.md).

## Purpose

Replace PrimeVue `Select` and `MultiSelect` (`nuxt.config.ts` → `primevue.components.include`)
with a single component whose `multiple` prop switches modes.
Not an API-compatible replacement: PrimeVue is being dropped and its API gets no vote.
25 call sites migrate. None of them use slots, option groups, `editable`, or lists over
~50 options, so migration is mechanical.

## Shape

```
base/select/
  Select.vue          both modes; `multiple` narrows `v-model` (ADR-0003)
  SelectControl.vue   shared: wrapper, trigger, clear button, indicator, $attrs split
  SelectPopup.vue     shared: search field, list, empty/loading states
  SelectOption.vue    shared: role="option" (NOT a <Button>)
  useSelect.ts        the deep module: normalization, Visible Options, keyboard, open state
  context.ts          createContext, per the accordion/carousel/dnd house pattern
```

`data-slot="dropdown-trigger"` is what Dropdown would merge on, so the control's
trigger uses `data-slot="select-trigger"`.

`SelectItem.vue` as it exists today is deleted — it encodes the rejected model where slot
children declare membership.

## Selection mode

`multiple` is declared **`M & boolean`**, never a bare `M`: a naked type parameter compiles to
`type: null`, Vue skips Boolean casting, and `<Select multiple>` arrives as `""` — falsy — so
the component silently behaves as single-select. The intersection emits `Boolean` while
TypeScript still infers the literal, which is what narrows `v-model` to `V[]` or `V | null`.

Two guards exist because that failure is invisible at runtime and to ordinary tests: the
`multiple: ''` case in `SelectModes.spec.ts`, and `pages/test/select-types.vue`, which
`vue-tsc` checks. Neither is decorative — see ADR-0003.

`modelValue` has no `default`, since the modes would need different ones. The `#value` slot has
one signature for both: `{ modelValue, option, options, unresolvedCount }`.

## Core model

The `items` array is the single source of truth for option membership, order and identity.
Slots control presentation only; they can never add, remove or reorder an Option.

Each Item normalizes to an Option via four accessors, each `keyof T | ((item: T) => X)`,
mirroring `useCheckbox`'s `valueAdapter` overloads:

| prop | yields | notes |
| --- | --- | --- |
| `itemLabel` | `string` | rendered; matched by Search and Typeahead |
| `itemValue` | anything | what `v-model` emits; omit ⇒ the whole Item |
| `itemKey` | primitive | identity; **required** when `itemValue` is omitted |
| `itemDisabled` | `boolean` | optional |

Groups are opt-in via a fifth accessor, `itemGroup`, yielding the Group's display label.

**Key is not Value.** Matching `modelValue` back to an Item is always done on Key, never on
Value. Two structurally-equal Values from different sources — a saved search restored from a
URL query vs. a freshly-fetched list — are not reference-equal, and `find(i => i[v] === val)`
would silently return `undefined`. Key also serves as the `v-for` key and gives multiple mode
O(1) `Set` membership instead of `useCheckbox`'s O(n) `Array.includes`.

### Groups

`itemGroup` takes flat rows and clusters them. **Groups appear in first-appearance order** —
a Group takes the position of its first member, and Options keep their relative order within
it — so already-clustered `items` pass through unchanged and grouping never reorders tidy
data. Options with no group form a Group with an empty label that renders without a header
and takes its place in the same ordering.

This is the one place `items` is *not* the source of truth for order: membership and identity
still come solely from `items`, but Visible Options is emitted in **visual** order so that
arrows, `Home`/`End` and Typeahead follow what the user sees.

Visible Options stays a flat array; `groups` is a derived view used only for rendering, so
keyboard navigation never learns about nesting. Because a Group is built *from* the matched
Options, a Group with nothing in it cannot exist — filtering removes empty Groups and their
headers automatically.

**Select takes both input shapes.** Flat rows use `itemGroup`; nested data passes
`itemChildren`, which switches `items` from Options to Groups. `itemGroup` always reads from
an element of `items` — the Option when flat, the Group object when nested — and every other
`item*` accessor keys off the **Option** type either way.

This was originally rejected on the grounds that deriving the Option type from the children
would need a second generic and would degrade `v-model`'s type. Measured rather than assumed:
key accessors (`item-value="gameId"`) infer correctly in every nested variant, and nesting is
verified at a call site in `pages/test/select-types.vue`, including that `item-label="title"`
(a Group key) is rejected.

The one real limitation, which **predates nesting and applies to flat input too**: a
*function* accessor needs its parameter typed explicitly — `:item-value="(g: Game) => g.gameId"`
infers, while `:item-value="g => g.gameId"` cannot be contextually typed and silently falls
back to whole-Item mode. Prefer key accessors.

Nested input is expanded inside `useSelect`, so filtering, grouping and keyboard navigation
keep seeing one flat array. Nested input and the equivalent pre-clustered flat input produce
identical output — there is a test asserting exactly that.

ARIA follows the structure Base UI uses: a `role="group"` wrapper whose `aria-labelledby`
points at an **`aria-hidden`** header, with options as *direct* children. The header is hidden
so the label is announced once, as the Group's name, rather than twice. Options are `div`s
rather than `li`s precisely so they can be direct children — `role="option"` overrides list
semantics anyway, so an `li` would only force a filler list element that exists to be ignored.

## Search and filtering

Two orthogonal props, deliberately not PrimeVue's single conflated `filter`:

- `searchable: boolean` — renders the search field (slot-overridable; default a text input)
- `filterFn?: (item, query) => boolean` — how a Label is matched; defaults to substring
- `externalFilter: boolean` — the parent narrows `items` itself; render them untouched

`externalFilter` is the server-side search path, where the parent swaps `items` when its
request resolves. There is one filtering `computed`, not two code paths.

`externalFilter` exists as its own prop rather than as a `filterFn: false` sentinel because
the sentinel does not work. A `false | Function` prop union compiles to
`type: [Boolean, Function]`, and Vue's Boolean casting then defaults the *absent* prop to
`false` — so every call site that never passed a filter would silently have filtering
disabled. This is the same casting rule as ADR-0002, biting from the opposite direction.
`Select.spec.ts` guards it.

The Search Query resets when the popup closes. (The 15 existing `:reset-filter-on-hide="false"`
call sites were copy-paste, not a requirement.)

All keyboard navigation operates over **Visible Options**, never over `items`.

Known awkward state, accepted: in multiple mode, Selected Options can be filtered out of view —
the trigger says "3 selected" while none are visible.

## Typeahead vs Search

Mutually exclusive, keyed off `searchable`. Both configurations will exist in this app
simultaneously, since the house pattern is `:searchable="xs.length > 6"`.

| | `searchable: false` | `searchable: true` |
| --- | --- | --- |
| trigger role | `combobox` (select-only combobox) | `button`, `aria-haspopup="listbox"` |
| what owns `aria-activedescendant` | the trigger | the search input |
| printable char, closed | open + Typeahead | open + **seed the query with that character** |
| printable char, open | Typeahead | goes to the search input |

There is exactly one `combobox` at a time. When a search field exists it is the combobox and
owns `aria-controls` / `aria-activedescendant`; the trigger demotes to a disclosure button.
When there is no search field the trigger itself is the combobox.

The seeded character is not optional. DOM focus is on the trigger when closed, so opening the
popup and moving focus to the input swallows the keystroke that opened it.

## Keymap

Movement is over Visible Options, skipping disabled entries.

**Closed**

| key | behaviour |
| --- | --- |
| `ArrowDown` | open; Active = Selected, else first |
| `ArrowUp` | open; Active = Selected, else last |
| `Alt`+`ArrowDown` | open, Active unset |
| `Enter` / `Space` | open |
| printable char | see above |
| `Home` `End` `PageUp` `PageDown` | ignored |

**Open**

| key | single | multiple |
| --- | --- | --- |
| `ArrowDown` / `ArrowUp` | ±1, clamp at ends | same |
| `Home` / `End` | first / last enabled | same |
| `PageDown` / `PageUp` | ±10, clamped | same |
| `Enter` | select Active, close | toggle Active, stay open |
| `Space` | select + close — **only when `!searchable`** | toggle — **only when `!searchable`** |
| `Escape` | close, selection unchanged | same |
| `Tab` | close **without** selecting | same |
| `Alt`+`ArrowUp` | close | same |

Deliberate choices, so they don't get "fixed":

- **`Space` is conditional.** When `searchable`, Space types a space — otherwise searching
  "call of duty" selects something mid-word. The keymap is intentionally non-uniform.
- **Clamp, not wrap.** APG doesn't require wrapping and it's disorienting in long lists. Add
  a `loop` prop only if asked.
- **`Tab` does not commit.** "Focus moved" and "value changed" must never be the same gesture,
  even though Chrome-autofill muscle memory expects otherwise in a searchable combobox.
- **`PageUp`/`PageDown` is a flat 10**, not a measured viewport page — deterministic and
  testable, and independent of CSS.

Edge states: zero Visible Options, or all Visible Options disabled ⇒ no Active Option, `Enter`
is a no-op, `#empty` slot renders, and arrow keys must not loop looking for an enabled option.

## Selected is not Active

One signal per concept: **a tick means Selected, a tint means Active.** `.list-select-item`
paints `aria-selected`, `data-selected` and `:hover` the same colour, so selected, active and
hovered were indistinguishable — in a single Select you could not tell what you had chosen
once you arrowed away from it, and in multiple mode the whole point is seeing several at once.

Select therefore owns `.select-option` rather than sharing `.list-select-item`. An option has
a three-state model (active / selected / disabled) the generic list item does not, and keeping
them separate leaves the four other `.list-select-item` call sites untouched.

The tick slot is **always rendered**, empty when unselected, so a first selection never shifts
the labels sideways. The icon is `aria-hidden`: `aria-selected` on the option already carries
the meaning. It is deliberately a tick and not a checkbox — drawing something that looks like a
control the user cannot focus or tab to invites them to try — and it must never be a real
`input`, which would be the same invalid interactive nesting as a `<button>` inside a `<button>`.

## Trigger structure

`clearable` forces this. `Button.vue` renders a real `<button>`, so a clear button inside the
trigger would be `<button><button/></button>` — invalid, reparented by the browser, and
unreachable for screen readers.

```
<div class="select-control">     ← wrapper: layout, border, focus ring
  <button data-slot="select-trigger">   ← `role=combobox` only when not searchable
  <button data-slot="clear">           ← sibling, not child
  <Icon chevron />
</div>
```

Follow `form/InputWrapper.vue`, which already implements this exact pattern (absolutely
positioned sibling button, `ph:x-circle`, `text-field-icon group-focus-within:text-primary!`).

The clear button carries `tabindex="-1"`: it renders only when there is something to clear,
but a form like `SearchForm.vue` has nine Selects, and one Tab stop per filled field adds up.
`tabindex="-1"` removes the stop while **keeping the button in the accessibility tree**, so a
screen reader still reaches it by virtual cursor. Two mitigations make the keyboard path
discoverable: `aria-keyshortcuts="Delete"` on the trigger whenever there is something to
clear, and a `title` naming the shortcut on the button itself.

Known gap, accepted: a **sighted keyboard-only user who does not use a screen reader** sees the
✕, cannot Tab to it, and has nothing on screen telling them `Delete` exists. That is the cost
of removing the stop, and "they can use the mouse" is not an answer for someone who is
keyboard-only by necessity.

Clearing **returns focus to the trigger**. The button unmounts the instant there is nothing
left to clear, so without this focus lands on `<body>` and a keyboard user loses their place
in the form — a Focus Order failure, not a missing nicety. It also earns the announcement for
free: focus landing on the trigger makes the new state read out.

`Delete`/`Backspace` clears **while the popup is closed** — and since the button left the Tab
order, this is the *only* keyboard path to clearing, not a convenience shortcut. An earlier draft rejected this on
the grounds that Backspace must edit the query when `searchable` — true only while the popup
is *open*. Closed, focus is on the trigger and there is no query, so the shortcut is
unambiguous in every configuration.

## Loading

One `loading` prop, meaning "the options list is not yet authoritative". It covers both
fetching options and an in-flight server-side search, rendered differently:

| state | render |
| --- | --- |
| `loading`, `items` empty | spinner in the popup body (`InnerLoading.tsx`) |
| `loading`, `items` non-empty | keep the list live and navigable, subtle indicator |
| `loading`, popup closed | indicator in the trigger |

`loading` does **not** disable the trigger — a disabled control just looks broken.

### Blocked

`loading` with **no** Items at all blocks opening: the popup would be an empty box showing a
spinner the trigger already shows. The guard lives in `useSelect.open()` **and** on Dropdown's
`disabled` prop, because Dropdown owns click-to-open — guarding only `open()` blocks the
keyboard while letting a mouse click through.

Blocked is announced as **`aria-disabled`, never the native `disabled` attribute**: the control
must stay focusable so a keyboard user can land on it and hear it is not ready. It is paired
with **`aria-busy`**, which tracks `loading` alone. The two conditions differ on purpose —
*is it updating* versus *can I operate it* — and will look like something to "simplify".

Blocked is deliberately **not** styled like `disabled` (no dimming). A Select that greyed out
for 300ms on every page load and came back is the flicker the loading design set out to avoid.

The second row is what stops server-side search flickering to a spinner on every keystroke.

## Unresolved Values

A Value whose Item is absent from `items`. Happens on first paint at every call site that
pairs `v-model` with `:loading` (e.g. `SearchForm.vue:167`).

| state | trigger renders |
| --- | --- |
| Value set, no matching Item, `loading` | skeleton / dimmed — *resolving* |
| Value set, no matching Item, not `loading` | `#value` slot if given, else placeholder |
| no Value | placeholder |

Rendering the placeholder while loading is a lie plus a flicker, which is the current
behaviour. Row two is a genuinely dangling Value — the parent's state disagrees with its
`items` — so the `#value` slot lets the parent render `modelValue` raw if it knows better.

## Ids, labelling, validation

- One optional `id` prop, defaulting to `useId()` (SSR-safe). Option ids derive as
  `` `${id}-opt-${key}` ``.
- `labelId` / `inputId` are dropped (17 call sites). The house pattern is `<Label :for="id">`
  plus `:id` on the control; Select should look like every other control in the app.
- **No vee-validate coupling.** A plain `invalid?: boolean` sets `aria-invalid` and error
  styling; the parent passes `formContext.errors.x`. `required` is presentational
  (`aria-required` + the existing `Label` asterisk). A base component that imports a form
  library can't be used outside a form.
- `$attrs` is **split**: `class`/`style` → wrapper; `id`, `aria-*`, `data-*`, listeners →
  trigger. Vue won't do this; it's a small `computed` over `useAttrs()`. Getting it wrong
  fails silently — `aria-labelledby` on a div announces nothing — so it needs a dedicated test.
  `pt` / `PtSlot` stays for styling on top.

## Click handling

Opening and closing on click is **Dropdown's** job, not Select's. Dropdown renders its trigger
through `Slot`, so its toggle (`triggers` defaults to `['click']`) is merged onto this very
button and chained with any handler already there — a `@click` toggle of our own would run
alongside it and double-toggle.

That double toggle only misbehaves under a real mouse: a genuine user gesture leaves the JS
stack empty between listener invocations, so the browser runs a microtask checkpoint, Vue
flushes, and Dropdown then reads the already-open state and flips it back — the popover
vanishes the instant it appears. Scripted `.click()` / `dispatchEvent` never reproduces it,
because the calling script is still on the stack and no checkpoint runs. Verify click
behaviour with real input, not `el.click()`.

Disabling Dropdown's click trigger instead (`triggers: []`) is not an option: Dropdown derives
`hasClickOutside` from `triggers`, so that would also disable click-outside dismissal.

## Why the search field carries `size="1"`

**`.inputtext` is `width: 100%`, so inside a shrink-to-fit container it silently falls back
to its `size="20"` intrinsic width and sizes the container instead.** A percentage width is
ignored when sizing a shrink-to-fit box, so the browser uses the input's intrinsic width —
twenty average character widths of the current font. `size="1"` is the cheap defence wherever
`w-full` is supposed to be in charge.

Shrink-to-fit means `inline-flex`, `inline-block`, a float, a `w-fit` flex/grid item, or an
absolutely positioned popup — which is what this popup is: its width is the `max-content` of
its children.

Concretely: in Poppins at 14px the field's intrinsic width is ~280px, which beats the list's
`max(--trigger-width, 200px)` and makes the popup visibly wider than the control that opened
it. `size="1"` drops that contribution to ~65px so the list is the only thing sizing the
popup; `w-full` still stretches the field to fill it. Do not remove it.

## Scrolling the Active Option

`scrollIntoView` runs for **keyboard navigation only** (`navigate()`), never when pointer hover
sets the Active Option (`setActiveIndex()`). Hover-driven scrolling makes `block: 'nearest'`
shift the list a few pixels to reveal a partly-visible row; the next `mousemove` then lands on
a different option and the highlight runs ahead of the cursor.

## Relationship to Dropdown

Select keeps using `Dropdown` for teleport, floating-ui positioning, click-outside and focus
restore. Dropdown's `ArrowDown` branch and `focusOnOpen` prop are removed: they implement a
competing roving-tabindex model (see ADR-0001). Dropdown keeps Escape, which is dismissal
rather than navigation.

Dropdown renders its trigger through `Slot`, so there is no wrapper element: it merges its
click handler and `aria-*` onto `SelectControl`'s own button. Sizing is therefore Select's
own business — the control is styled directly rather than through a `triggerClass` prop. The
merge order in `SelectControl` matters, and is guarded by a spec: the combobox's
`aria-haspopup="listbox"` and `data-slot="select-trigger"` must win over Dropdown's
`"true"` and `dropdown-trigger`.

Dropdown's deferred focus-restore on close now bails out if the popover reopened before the
timer fired. Without that guard, close-then-immediately-reopen restored focus to the trigger
*after* Select had deliberately focused its search field — a latent bug for every Dropdown
consumer, not just Select.

## Out of scope

- **Virtualization** — no list approaches a size that needs it; ADR-0001 keeps it possible.
- **Freeform / create-new-option entry** — explicitly not a goal. Tags are a *display*
  treatment for multiple mode, not arbitrary value entry.
- **API compatibility with PrimeVue.**
