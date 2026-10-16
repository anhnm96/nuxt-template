# Menu — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard,
a11y — see [README.md](./README.md).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). The architectural
decision lives in
[ADR-0009](../../../../docs/adr/0009-menus-are-menus-not-listboxes.md), which sits beside
[ADR-0001](../../../../docs/adr/0001-select-uses-aria-activedescendant.md) (Select's focus
model) and [ADR-0005](../../../../docs/adr/0005-calendar-uses-roving-tabindex.md)
(Calendar's).

## Purpose

Replace PrimeVue's `Listbox` and `ContextMenu` at the nine places this app uses them: eight
popover lists in `Tiptap.vue` and `InsertTableToolbar.vue`, and the tree context menu in
`pages/group.vue`.

Those nine set the ceiling. Five of the eight popovers report a value the editor owns —
font family, font size, alignment, ordered-list style, unordered-list style — and apply it
on activation. Three are pure commands. The context menu is commands with a per-item
disabled state. **None of them owns a value**, which is why none of them is a listbox and
why no `Listbox` component was written: it would have had no consumer to keep it honest.

## A menu is not a listbox

`role="listbox"` promises that the widget owns the value it shows. For the five property
popovers the editor owns it, so `aria-selected` on those rows is a false claim. The correct
role is `menuitemradio` with `aria-checked`.

The old code half-admitted this. `Tiptap.vue` bound `:model-value` one way, never wrote back
to it, and hung the real behaviour off a `@click` inside the `#option` slot — a listbox used
as a command menu, with the command smuggled past the component.

## Items come from the DOM

`Menu` takes no `items` array. It finds its rows with
`querySelectorAll('[role^="menuitem"]')`.

This is the opposite of `Select`, and the reason is the focus model rather than taste.
Roving `tabindex` puts real focus on the row, and real focus brings three things with it:

- DOM order is the navigation order, by construction.
- `aria-disabled` is already on the element, so disabled state needs no second copy.
- The browser scrolls the Focused Item into view. `Select` has to do that by hand, because
  nothing there is focused (ADR-0001).

A registry of children would have to re-derive all three, and would still have to sort
itself by DOM position once a consumer writes a `v-if`. So the registry costs more and buys
nothing.

`Select` cannot work this way, and the reason is worth stating so nobody tries to unify
them: Select's trigger renders the selected Label while the popup is **unmounted**. There
are no children to read at that moment. Select needs `items` as the source of truth; a Menu
has no equivalent requirement, because it holds nothing between openings.

### What this costs

Typeahead needs a Label, and `el.textContent` on a row of icon plus text is
whitespace-padded junk. `MenuItem` therefore writes `data-label` when given a `label` prop,
and the Menu prefers it over the trimmed text. That is a DOM-string contract rather than a
typed field, and it is the honest price of the decision.

## The shared navigation algorithm

`useListNavigation` owns the arithmetic: next/prev, `Home`/`End`, the page keys,
seek-past-disabled, and Typeahead with its buffer. It holds no cursor. The host reads and
writes that through `index()` and `onMove()`.

That seam is what lets one implementation serve two focus models. `Menu` projects "here" as
`el.focus()`; a widget using `aria-activedescendant` would project it as an id. Neither
appears in the composable.

It exists because the arithmetic was already written twice before this component — as
`seekEnabled` in `useSelect.ts` and as `moveSelection` in
`app/components/tab/TabList.vue`. A menu would have made three.

`calendar/utils.ts`'s `nextEnabledIndex` looks like a third and is not. It walks a 2D grid,
and it *refuses* a step that would leave the panel rather than clamping into range — which
is what stops `ArrowUp` in the top row sliding to another column. Folding it in would cost
a `columns` option, horizontal keys and a second clamping mode to serve one call site.
Leave it where it is.

**`useSelect` has since been moved onto it**, as its own piece of work rather than inside the
change that introduced `Menu` — a Select regression had to stay attributable. `Select` keeps
`Home`/`End` outside the shared keymap, because it passes the `-1` from an all-disabled list
on to `navigate` to clear its Active Option, where the shared `moveToStart`/`moveToEnd`
ignore an edge they cannot reach.

The migration found that none of Select's four spec files covered `Home`, `End`, the page
keys, `Alt`+`ArrowUp` or Typeahead. `SelectKeymap.spec.ts` was written against the *old*
implementation first, so the swap had to reproduce the keymap rather than define it.

## Wrap, where Select clamps

`base/select/DESIGN.md` is explicit: "Clamp, not wrap. APG doesn't require wrapping and it's
disorienting in long lists."

That reasoning is about a long, searchable listbox, and it does not transfer. The APG menu
pattern wraps, and so does every native menu. `useListNavigation` therefore takes a `loop`
option; `Menu` passes true and a listbox would pass false.

Calendar broke the same rule first, for its own reason (ADR-0005), so "clamp, don't wrap" is
a listbox rule rather than a repo rule.

Only the arrow keys wrap. `Home`, `End` and the page keys name an absolute place rather than
a step, so they clamp in both widgets.

## A Menu Item is a `div`, not a `<button>`

ADR-0005 argues the other way for Calendar, and it is a good argument: a native button makes
disabled state a platform primitive.

What decides it here is what `disabled` has to mean. A natively disabled `<button>` is
unfocusable and largely unannounced; a menu wants a disabled row that a screen reader can
still find and report as unavailable. `aria-disabled` on a div gives that, and the keyboard
skips the row either way. It is also what Radix and react-aria render for `menuitem`.

A second argument carried this decision originally and no longer does, which is worth
recording so nobody re-derives it. `Dropdown`'s `ArrowDown` focuses the **first** element
matching `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`, so with
buttons all 17 rows of the font-size menu match and `ArrowDown` from the trigger lands on
`8` rather than on the Checked Item; with divs, the roving row is the only match. That was
true, and ADR-0005 hit the same trap from the other side. It stopped being the operative
mechanism once the Menu began focusing itself on open: focus is inside the Popover before
that branch could ever run. The div is still the single match if some future Host does fall
through to it, but the reason to keep it is `aria-disabled`.

A second consequence falls out. `Dropdown` puts a blanket `aria-haspopup="true"` on every
trigger, which announces a menu. `DatePicker` has to override it. Here it is already right.

## Opening is a request for focus

A Menu mounted inside a popover was, by definition, just opened by its Host — so it moves
real focus onto its tab stop on mount. APG's menu-button pattern requires it.

Leaving it to the Host does not work, and the failure is quiet. `Dropdown` only moves focus
into its popover from the `ArrowDown` branch of its own keydown handler, so a Menu opened by
*clicking* the trigger left focus on the trigger. The popover is teleported, so keystrokes
there never reach the Menu: Typeahead and the arrow keys did nothing at all until the user
pressed an arrow (which `Dropdown` caught) or hovered a row (which focuses it). The Menu
looked open and correct — the tab stop was even on the right row — and simply ignored
typing.

The trigger is `hasHost`: whether a `HostContext` was injected. A Menu rendered inline
has no Host, mounting means nothing was opened, and taking the page's focus on render would
be exactly the bug ADR-0005 records for an inline `<Calendar period="quarter">`.

`ContextMenu` keeps its own `focus()` call as well, because it is not redundant: reopening
while the leave transition is still running never unmounts the Menu, so `onMounted` does not
fire a second time.

## The Menu swallows the context-menu gesture

`Shift`+`F10` and the context-menu key are the keyboard's way of asking for a context menu.
Pressed while a Menu is open, they opened the browser's own on top of it.

No Host can prevent that. `ContextMenu` cancels the gesture on its Anchor, which is why
summoning it from the keyboard works — but once the Menu is open, focus is on a row inside
the **teleported** popover, so the keypress never bubbles to the Anchor and nothing cancels
it. A Dropdown-hosted Menu has the same hole, and no Anchor handler at all.

So the Menu cancels it itself. It is already a context menu; a second one over the top is
never what the user asked for.

## The tab stop

Exactly one item carries `tabindex="0"`, so `Tab` leaves the Menu rather than walking 17
rows. The Menu sets it imperatively on the elements it already queries, which is why
`MenuItem` renders a **static** `tabindex="-1"`: Vue does not patch a static attribute, so
the imperative value survives re-renders.

Three things keep it correct:

- On mount it goes to the Checked Item, else the first enabled item. A font-size menu
  showing `11` must open on `11`. This mirrors `useSelect`'s `positionOnOpen`.
- `focusin` on the list moves it to whatever took focus. Keyboard navigation and pointer
  hover both work by focusing a row, so both arrive here and neither needs its own
  bookkeeping.
- `onUpdated` re-establishes it when the current one has gone — a `v-if` removed it, or it
  became disabled. It leaves a valid tab stop alone, so it never drags focus back mid-
  navigation.

That last one has to move focus as well, in one narrow case. A browser blurs an element
whose `tabindex` goes away, so the moment the Menu stops being its own tab stop — an item
became focusable again — the root is blurred to `<body>`, and an item removed by a `v-if`
lands there too. From `<body>` neither the Menu's keys nor the Host's `Escape` reach
anything, which is the same dead end the fallback below exists to prevent. So when the
element that held focus is the one the sync unfocuses, focus goes to the new tab stop.
Focus sitting on a row that merely became *disabled* is left alone: the row keeps focus,
the arrows still work from it, and jumping to the top of the Menu would be worse.

### When no item can hold focus

Every item disabled is a reachable state, not a theoretical one: in `pages/group.vue` a
deepest-level row with live descendants disables both of its items. The Menu then takes the
tab stop itself, which is the fallback the Calendar panels already use (ADR-0005).

Without it the failure is worse than "cannot navigate". A `ContextMenu` focuses its Menu on
open; if that call finds nothing to focus, focus stays outside the popover, and the Host
handles `Escape` on an element that never receives a keypress — so the Menu cannot be
dismissed from the keyboard at all.

`focus()` writes `tabindex` straight onto the element rather than waiting for the flag to
render. A Host focuses the Menu in the same tick it mounts, and `.focus()` does nothing to
an element that is not focusable yet.

## Groups bound a radio set, and navigation cannot see them

`MenuGroup` is `role="group"` around a run of Menu Items. APG asks that `menuitemradio` rows
sit inside one, so a screen reader can tell where a set starts and stops. Without it, a Menu
holding two radio sets reads as a single run of rows and "4 of 9" means nothing.

Navigation is unaffected, by construction. `Menu` queries `[role^="menuitem"]` across its
whole subtree rather than its direct children, so a Group is invisible to the keyboard:
arrows, `Home`/`End` and Typeahead all cross Group boundaries, and wrapping goes round the
whole Menu rather than round a Group. `base/select` takes the same line — "Groups exist for
presentation; keyboard navigation never sees them."

The heading is `aria-hidden` and referenced through `aria-labelledby` instead of being read
where it sits. Read in place it would be announced twice: once as a stray text node, once as
the Group's name. `SelectPopup` does the same thing for the same reason.

### The Tiptap groups are deliberately unnamed

All five Tiptap popovers are a single radio set each, and the Menu is already named after
the toolbar button — "Font Size". Naming the Group the same thing makes a screen reader say
it twice. So those call sites use a bare `<MenuGroup>`: the Menu's label supplies the name,
and the Group supplies the bounding.

`label` and `labelledBy` exist for the Menu that holds *more* than one set, where the Menu's
single name cannot distinguish them. No call site needs that yet, which is why `label`
draws a visible heading rather than hiding behind an `aria-label` — a group worth naming is
a group worth showing.

## Dismissal is a context, not a prop

Activating a Menu Item closes the popover around it. The Menu cannot name that popover, and
the two Hosts are shaped differently: `Dropdown` hands `toggleShow` to its `#popover` slot,
and `ContextMenu` has no such slot at all.

So both provide `HostContext`, and the Menu injects it. Close-on-activate stops being a
`toggleShow(false)` that each of the nine call sites has to remember — which is exactly what
the old code did, once per site.

The injection carries a no-op fallback, so a Menu rendered outside any popover still works.

## Space is not a Typeahead character

`useListNavigation` excludes `' '` from Typeahead. Space activates the Focused Item in every
widget that uses the composable, and a Typeahead buffer cannot usefully start with one.

The cost is real and accepted: a space *inside* a buffer is lost with it, so typing
"new y" to reach "New York" does not work. `Select` makes the same trade for the same
reason, and solves the long-label case with a search field instead.

## Typeahead follows APG's order

Three steps, in the order [APG's select-only combobox][apg-combobox] uses, because the order
is what decides the ambiguous cases:

1. **The buffer as typed**, from the row after the cursor. `c` then `h` therefore steps past
   a Charlie already under the cursor onto Chess — APG passes `activeIndex + 1` for every
   search, whatever the buffer holds. Radix and react-aria include the current row once the
   buffer grows and so keep Charlie; that is a divergence from APG, and this repo does not
   take it.
2. **The repeated-letter cycle**, only once step 1 has matched nothing. A buffer of one
   character repeated is read as that character, so pressing `c` three times walks Copy,
   Cut, Clear. Searching `ccc` alone would match nothing from the second keystroke on and
   the cursor would stick.
3. **Give up, and drop the buffer.** A dead end is dropped rather than left to expire, so a
   typo costs one keystroke instead of poisoning every keystroke until the 500ms reset.

Step 1 before step 2 is the part worth stating. A list holding `Aardvark` must answer a
second `a` with that row, because `aa` is a real prefix — collapsing to the first character
first would walk past it to the next `A` row instead.

[apg-combobox]: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/

## Out of scope

- **Submenus** — no call site needs one. It is the largest piece of menu complexity: it
  breaks the flat DOM query (`:scope >`), needs hover intent, and reopens the
  Escape-propagation problem ADR-0005 found in `QuarterPicker`, where one keypress closed
  both a panel and its `Dropdown`.
- **`menuitemcheckbox`** — no call site needs a multi-toggle. Additive when one appears.
- **A `Listbox` component** — deferred until something owns a value. ADR-0009.
