# Tree — design

Why this component is built the way it is. For how to *use* it (props, slots, keyboard) see
[README.md](./README.md). Terms in Title Case are in [CONTEXT.md](../../../../CONTEXT.md),
section Tree.

## The Tree roves real DOM focus

The Tree has no text input. The reason that made `Select` use `aria-activedescendant`
([ADR-0001](../../../../docs/adr/0001-select-uses-aria-activedescendant.md)) is a search
field that must keep focus, and it does not apply here. The Tree follows `Calendar`
([ADR-0005](../../../../docs/adr/0005-calendar-uses-roving-tabindex.md)) and `Menu`: one row
has `tabindex="0"`, and the arrow keys move real focus.

The movement and the Typeahead come from `useListNavigation`, over the Visible Nodes. Each
`NavigableEntry` is passed as enabled, because APG keeps a disabled treeitem focusable. Right,
Left, `*`, Enter and Space are Tree keys, and `Tree.vue` handles them before
`useListNavigation` sees the event. `Tree.vue` also keeps `PageUp` and `PageDown` from
`useListNavigation`: APG defines no page keys for a tree, so the browser uses them to scroll.

`focusedNode` holds the Node object and not its Key, so its ancestors stay known after its
Parent Node collapses or its Item leaves `items`. One computed, `focused`, resolves it to the
current Visible Node or its nearest ancestor that is a Visible Node, and every reader uses that. When the two
differ while the Tree has focus, a watcher moves focus to `focused`. Without this, focus goes to
`<body>` when the row leaves the document.

On `focusout` to outside the Tree, `focusedNode` is cleared. Focus that returns to the Tree
then enters at the Selected Node, as APG specifies, and not at the last Node the user left.

## The row is the treeitem, not the `li`

APG puts `role="treeitem"` on the `li` and the child `group` inside it. The accessible name of
such a treeitem is computed from its content, which includes the Labels of every descendant.
Here the `li` is `role="none"`, the row is the treeitem, and the `group` is a sibling of the
row.

The cost is that the browser cannot compute the level and the position from the nesting, so
each row sets `aria-level`, `aria-posinset` and `aria-setsize`. The same attributes are what a
virtual mode would need, because a flat list of rows has no nesting at all.

## It does not share the Select listbox

`base/listbox` is the popup view of `Select` and `Autocomplete`. Its Group exists only for
presentation, and navigation never sees it. In a Tree, a Parent Node is a Node: it is focused,
selected and expanded. The two models disagree at the root, so a shared view would carry both.

What the Tree does share with `Select` is the contract of its model: the `item*` accessor
names, `OptionAccessor`, the rule that both match on Key, and `multiple` as `M & boolean`
([ADR-0003](../../../../docs/adr/0003-select-handles-both-modes-in-one-component.md)). The
model is `useTree.ts`, and it does not know about focus or the DOM.

## A Tree without `v-model` cannot select

`defineModel` keeps a local value when nothing is bound, so a Tree that always selected would
show a selection that the consumer cannot read. The Tree reads its vnode props one time, at
setup, and selects only when `modelValue` or `onUpdate:modelValue` is bound. A template does
not add a `v-model` at runtime, so one read is enough.

## Enter and Space toggle a Node that cannot be selected

Enter and Space select. On a Parent Node that cannot be selected, they toggle it instead. That
covers a disabled Parent Node, every Parent Node under `selectParents: false`, and every
Parent Node of a Tree without `v-model`.

APG gives Enter the "default action" of a node, and names opening or closing as one possible
default action of a parent node. Without the toggle, Enter does nothing on these Nodes, and a
Tree without `v-model` has no key that acts on a Parent Node except Right and Left.

## A row is a component

The Tree renders every Visible Node. If the rows render inline in `Tree.vue`, every row reads
the Focused Node, the tab stop and the selection, so one arrow key re-renders every row and
calls every slot again.

`TreeRow.vue` is one Node and its children. It reads the state from `TreeContext` as Keys and
predicates, and makes a boolean computed of its own from each: `isFocused`, `isTabStop`,
`isSelected`, `isExpanded`. A focus move runs that comparison in every row, but only the two
rows whose boolean changed re-render. A selection re-renders one row. `Tree.spec.ts` counts the
slot calls to keep this true.

The slots stay the slots of `Tree.vue`, typed by `defineSlots`. The context carries them to the
rows untyped, and `SlotOutlet` in `TreeRow.vue` calls them. `SlotOutlet` takes the slot props
as a prop, so that Vue re-renders it when they change.

This holds only while the Node objects stay the same. A new `items` array builds every Node
again, and every row then re-renders. The README tells consumers to keep `items` stable.

## Expansion is grid rows, and the list is cut only during the transition

The children animate from `grid-template-rows: 0fr` to `1fr`. The list has `overflow: hidden`
only in the `enter-active` and `leave-active` classes. The list of an Expanded Parent Node
does not cut the focus outline of its rows. Vue removes the children after the leave
transition, so a collapsed Parent Node has no rows in the document, and Typeahead and Tab
cannot reach them.

## Known limitations

- **Screen readers are not tested.** The roles and attributes follow APG. How NVDA, JAWS and
  VoiceOver announce a treeitem whose group is a sibling is not verified.
- **No virtual mode.** Every Visible Node is in the document. `useVirtualRows` in
  `base/listbox` can render a flat list of fixed-height rows, and the row attributes are
  already explicit. The template would have to render the Visible Nodes flat, with the
  indentation and the guide lines drawn from `level`.
- **Focus is lost when `items` becomes empty.** The Tree has no row left to focus, and its
  root is not focusable, so focus goes to `<body>`.
- **Space does not reach Typeahead.** `useListNavigation` keeps Space for activation, so a
  Label with a space cannot be matched past the space. `Select` and `Menu` have the same rule.
- **No children on demand.** An `undefined` children field is a Leaf Node today. Loading on
  expand would need a third state that is a Parent Node without loaded children.

## Out of scope

- **Drag and drop.** Reordering has its own keyboard model. `components/SortableTree.vue` does it
  with sortablejs.
- **Checkbox cascade.** A Parent Node that selects its children, with an indeterminate state,
  raises its own questions: whether a disabled child is selected with the parent, and what
  the model holds when all children are selected.
- **Site navigation.** Use nested lists of links. They are each a tab stop, and a Tree is not.
