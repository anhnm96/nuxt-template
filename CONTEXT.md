# Nuxt Template — Base Components

Hand-rolled, accessible base UI components under `app/components/base`. No headless
component library (reka-ui, radix-vue) is used; shared behaviour lives in composables
and `createContext.ts`. These components are replacing PrimeVue, which is being dropped.

## Language

### Shared

**Track**:
The full span a value is drawn against, and the coordinate space anything drawn on it sits
in. A Slider's Track runs from `min` to `max` and a press maps a position along it to a
value; a Progress Bar's runs from none to complete and nothing maps; a Switch's runs from off
to on, and is the root element rather than a child of it. Distinct from the Fill, which is
drawn on top of it.
_Avoid_: Rail, bar, groove

**Fill**:
The drawn part of the Track. Presentation only — it carries no value of its own. A Slider
fills between the Origin and a Thumb, or between two Thumbs; a Progress Bar fills from the
start of the Track to the Progress.
_Avoid_: Highlight, range (that is a Slider prop); and Progress, except in the Progress Bar,
where the Fill is the only thing drawing it

**Thumb**:
The drawn element whose position along the Track reports the state. A Slider's Thumb holds
DOM focus and reports one value; it is always rendered and always focusable whether or not it
is drawn, a Slider has one or two of them, and neither of two is "the lower one" — that is
whichever currently holds the smaller value. A Switch's Thumb holds no focus and no value:
the Switch itself is the control, and the Thumb is only where its state can be seen.
_Avoid_: Handle (that is dnd's grab-target selector), knob, grip

**Readout**:
A control's own state drawn as text inside it, for a human to read. Never announced: every
role that has one — `progressbar`, `switch` — makes its children presentational, so whatever
a reader should hear must be supplied again as the accessible name or as `aria-valuetext`. A
Progress Bar's Readout is the Progress, shown only on request and never while Indeterminate,
because there is no number to read; a Switch's is a fixed pair of strings, one per state.
Distinct from the accessible name, which is never drawn and is what a reader announces
instead.
_Avoid_: Label, value text, caption, percentage

### Select

**Item**:
An element of the `items` array a consumer passes in — raw, consumer-shaped domain data.
The `items` array is the single source of truth for option membership and identity. When
`items` holds Groups rather than Items, the Items are the Groups' children.
_Avoid_: Option (see below), record, row

**Option**:
The normalised view of an Item that the component works with: its Key, Value, Label and
disabled state. Slots may change how an Option looks, never which Options exist.
_Avoid_: Choice, entry

**Label**:
The string rendered for an Option and matched against by Typeahead and Search. Always a
string, never an object.
_Avoid_: Text, title, display name

**Value**:
What `v-model` emits for a selected Option. May be any shape, including the whole Item.
Not usable for comparison.
_Avoid_: Model value, selection

**Key**:
The primitive, stable identity of an Option. Used to match `modelValue` back to an Item,
as the `v-for` key, and for set membership in MultiSelect. Distinct from Value: two
structurally-equal Values from different sources are not reference-equal, so matching is
always done on Key.
_Avoid_: Id, index

**Visible Options**:
The Options currently navigable — `items` narrowed by the Search Query, then clustered into
Groups. All keyboard navigation, Typeahead and index arithmetic operate over Visible Options,
never over the full `items` array. Their order is _visual_ order, which is why `items` is the
source of truth for membership and identity but not, once Groups exist, for order.
_Avoid_: Filtered items, shown options

**Group**:
A run of Options sharing a group label, drawn under a heading and announced as a unit.
Groups exist for presentation; keyboard navigation never sees them. A Group with no Visible
Options does not exist.
_Avoid_: Category, section, optgroup

**Blocked**:
A Select that cannot be opened right now because the popup would have nothing to show — the
Items are loading and none have arrived. Distinct from disabled: a Blocked Select is still
focusable, and the state clears by itself.
_Avoid_: Disabled, busy, inactive

**Active Option**:
The Option carrying visual focus — the one pointed at by `aria-activedescendant`. It is
highlighted by class, not by `:focus`, and holds no DOM focus.
_Avoid_: Focused option, highlighted option, hovered option

**Selected Option**:
An Option present in the current selection. Independent of the Active Option: the Active
Option is where the keyboard is, the Selected Option is what the model holds.
_Avoid_: Chosen option, current option

**Unresolved Value**:
A Value held by the model with no matching Item in `items` — either because the Items are
still loading, or because the Value is genuinely dangling. Not the same as no Value.
_Avoid_: Missing value, orphan value

**Search Query**:
The text entered in the Select's search field, used to derive Visible Options. Distinct
from Typeahead. Resets when the popup closes.
_Avoid_: Filter, filter text

**Typeahead**:
Jumping the Active Option to the next Visible Option whose Label starts with recently
typed printable characters. A navigation aid only — it never narrows Visible Options.
_Avoid_: Search, filter, autocomplete

**Trigger**:
The single interactive element that holds DOM focus and carries `role="combobox"` — a
button when the Select is not searchable, a text input when it is. Distinct from the
control wrapper around it, which owns layout and the focus ring but is not focusable.
_Avoid_: Input, button, control

### Tooltip

**Anchor**:
The element a Tooltip describes and is positioned against — by default the parent of the
component. Not a Trigger: it keeps its own role and its own activation, which the Tooltip
must not replace (except where an Interactive Tooltip owns the Tap).
_Avoid_: Trigger, reference, target

**Tooltip**:
A short, non-interactive description of its Anchor, shown on hover or focus and announced
as the Anchor's description. It never holds focus or anything clickable; on touch it is a
transient peek that never blocks the Anchor's own tap. Unless it is an Interactive Tooltip.
_Avoid_: Hint, title

**Interactive Tooltip**:
A Tooltip that may hold interactive content (e.g. Edit / Delete buttons). It is a preview,
not a description, so it is not announced as one. Serves mouse and touch only — keyboard
and screen-reader users reach the same actions through the Anchor itself. With a mouse it
opens on hover and can be hovered into; on touch it is opened by a Tap and stays open until
dismissed. Never follows the cursor.
_Avoid_: Hover card, rich tooltip, popover, toggletip

**Tap**:
A touch press released without moving far enough to count as a drag. On the Anchor of an
Interactive Tooltip, a Tap opens the tooltip _instead of_ activating the Anchor; a press
that moves is a drag and opens nothing.
_Avoid_: Click, touch, press

### Calendar

**Period**:
The unit one selection covers — a date, a month, a quarter or a year. Every value the
Calendar carries is the first day of a Period, and every comparison it makes — selection,
bounds, the Today marker — is made at Period granularity.
_Avoid_: Granularity (that is time precision), view, type, unit

**Visible Date**:
The Date the Calendar is scrolled to. Distinct from the selection: a Calendar with no value
still has a Visible Date, and paging with the arrows changes it without changing the model.
What it anchors depends on the Period — a month's grid, a year's panel, or a page of years.
_Avoid_: Visible month, current month, displayed month, page

**Terminal View**:
The View that commits. It is whichever View matches the Period; every other View is a
Navigational Panel. `Escape` returns to the Terminal View, and from it `Escape` belongs to
whatever wraps the Calendar.
_Avoid_: Active view, final view, leaf view

**Navigational Panel**:
A View above the Terminal View, used to move the Visible Date rather than to choose a value.
Selecting in one never changes the model.
_Avoid_: Picker, chooser, overlay

**View**:
Which grid the Calendar is showing — days, months, quarters or years. Views replace one
another in place; they never layer. Changing View is navigation only; only the Terminal View
alters the selection.
_Avoid_: Mode (see mode), panel, screen

**Outside Day**:
A day cell in the grid belonging to the previous or next month. Drawn dimmed, but fully
selectable — selecting one moves the Visible Month to that day's own month.
_Avoid_: Padding day, adjacent day, spillover

**Selected Day**:
A day present in the current selection. Independent of which day holds focus: focus is where
the keyboard is, the Selected Day is what the model holds.
_Avoid_: Active day, chosen date, current day

**Today**:
The day the Calendar was mounted on, read from the system clock. Ambient — never supplied by
a consumer. Independent of the selection; a day can be both.
_Avoid_: Now, current date

**Disabled Day**:
A day that cannot be selected and cannot be reached by the keyboard — it is outside what the
Calendar offers at all. Produced by the Calendar's bounds or by `isDateDisabled`.
_Avoid_: Unavailable (see below), invalid, blocked

**Unavailable Day**:
A day that is present and navigable but cannot be selected — a real, relevant date someone
cannot have. Focusable and announced as unavailable, and drawn struck through. Distinct from
a Disabled Day, which the keyboard never reaches; where both apply, Disabled wins.
_Avoid_: Disabled, taken, blocked

**Week Number**:
The ISO 8601 week a displayed row belongs to, defined as the ISO week of the Thursday inside
that row. Shown in its own non-interactive column. Because ISO weeks run Monday to Sunday, a
row starting on another day belongs to two of them, and the Thursday decides which is named.
_Avoid_: Week of year, week index, row number

### Menu

**Menu**:
A transient list of Menu Items, shown by a Menu Host and dismissed when one is activated.
It commands something that lives outside it; it holds no value of its own. Distinct from the
Select popup, which presents Options belonging to a model.
_Avoid_: Listbox, option list, dropdown, popup

**Menu Host**:
Whatever positions a Menu and dismisses it — `Dropdown` where a trigger element exists,
`ContextMenu` where only a cursor point does. A Menu owns no placement of its own, so every
Menu has exactly one Host.
_Avoid_: Wrapper, container, popover, parent

**Menu Item**:
One row of a Menu. Activating it runs an effect and closes the Menu. Distinct from an Option:
an Option is a candidate Value the Select owns, a Menu Item is a thing to do.
_Avoid_: Option, action, entry, command

**Menu Group**:
A run of Menu Items bounded by `role="group"`, so a reader can tell where a set of Checked
Items starts and stops. Presentation and announcement only — navigation crosses Group
boundaries as if they were not there, exactly as a Select Group does.
_Avoid_: Section, category, radio group

**Checked Item**:
A Menu Item that reports a value its host already holds and sets that value when activated —
font size, text alignment. The host owns the value, so the Menu reads it and never stores it.
Distinct from a Selected Option, which the Select itself owns.
_Avoid_: Selected item, active item, radio item, toggle

**Focused Item**:
The Menu Item holding real DOM focus. A Menu roves `tabindex`, so where the keyboard is and
where focus is are the same place — there is no Active Option here, and no
`aria-activedescendant`.
_Avoid_: Active item, highlighted item, current item

### Slider

**Driven Thumb**:
The Thumb being dragged, or holding DOM focus. While a Thumb is driven the Slider does not
re-read Thumb positions from the model, because the model is the sorted projection of two
freely-ordered Thumbs and reading it back would teleport them through each other.
_Avoid_: Active thumb, current thumb, focused thumb

**Origin**:
The value the Fill grows from. Defaults to `min`, so a Fill normally starts at the Track's
left edge. A brightness Slider over `-100..100` sets it to 0 and fills outward from the
centre in whichever direction the value went.
_Avoid_: Start, base, zero, anchor

### Progress Bar

**Progress**:
How far a task has got, from none to complete. Forward-only and finite: a task ends.
Distinct from a measurement inside a known range — a battery level, a disk quota or a
strength score is a Meter, which this is not and does not become.
_Avoid_: Value, percentage, completion, status

**Indeterminate**:
A Progress Bar with no Progress to report: the task runs and nothing knows how far it has
got. Distinct from a task at none, which is a known zero. Indeterminate is a state of
knowledge, not a value, so there is nothing to announce and nothing to fill.
_Avoid_: Loading, busy, pending, infinite

### Switch

**Switch**:
An on/off control whose change takes effect at once. Distinct from a Checkbox, which states
an intention that a form submits later: a Switch has no pending state, is never required, and
is never one of a set of values. It is a `<button>`, so a `<label>` cannot name it and the
name must arrive as an attribute.
_Avoid_: Toggle, toggle button, checkbox
