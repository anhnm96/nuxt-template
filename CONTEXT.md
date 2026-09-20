# Nuxt Template — Base Components

Hand-rolled, accessible base UI components under `app/components/base`. No headless
component library (reka-ui, radix-vue) is used; shared behaviour lives in composables
and `createContext.ts`. These components are replacing PrimeVue, which is being dropped.

## Language

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
never over the full `items` array. Their order is *visual* order, which is why `items` is the
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
