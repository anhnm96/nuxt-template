# Tabs — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard —
see [README.md](./README.md).

## A tab owns values, not a value

The constraint came from a view switcher. Four views earn a pill of their own; two more are
rare enough that they share one pill with a menu inside it. That last pill has to light up
while either of its views is active, and a tab that holds one value cannot.

So `Tab` takes `Primitive | Primitive[]`, and a tab is selected when the model holds any
value it owns. The root model stays a single `Primitive`, because "which tab answers to
this?" and "what is active?" are different questions and only the first one is plural.

The first value is the tab's identity. It builds the DOM id, and it is what selecting the tab
commits. Identity has to be single-valued — an id derived from the whole array changes
meaning as soon as the array does.

What this costs: a multi-value tab cannot select on click, because it has no single value to
commit. `Tab` therefore skips the model write when it owns more than one value, and the tab's
own content has to set the model. A multi-value tab with nothing interactive inside it is
inert to the pointer, and nothing warns you.

## The indicator asks the root, never the DOM

The indicator used to find the active tab by rebuilding its id from the model value, with
``document.getElementById(`tab-${modelValue}__${tabsId}`)``. That assumes one id per model
value, which is exactly the assumption a multi-value tab breaks. With the model on
`timeline_day` and the tab identified by it, no element carried that id and the indicator
silently kept its last measurement.

Querying `[role="tab"][aria-selected="true"]` under the indicator's own `parentElement` was
the first replacement. It works, and it couples the indicator to where it is mounted: one
level of nesting and the query finds nothing, with no error.

The root now owns the answer. Each `Tab` registers its root element with the root, along with
how to select it and whether it is currently selected, and the root derives `activeTabEl`
from that map. The indicator reads it. No ids, no DOM queries, no assumption about where the
indicator sits.

**The registry is reactive, and that is not decoration.** A `Tab` registers in its
`onMounted`. `TabIndicator` is usually the first child of `TabList`, so *its* `onMounted`
runs first, when the map is still empty. A plain `Map` left the indicator measuring nothing
on first paint. With `shallowReactive`, the registration invalidates `activeTabEl`, and the
indicator's post-flush watcher measures once the tabs arrive.

The watcher fires on `activeTabEl` rather than on the model, so moving between two values of
the *same* tab does not re-measure. That is what we want — the element has not changed — and the
`ResizeObserver` catches the width change when such a move relabels the tab.

## Keyboard navigation selects through the root

`TabList` used to move by calling `tabs[newIndex].click()`. A synthetic click is the wrong
instrument now: on a multi-value tab a click opens its menu instead of selecting it, so
arrowing onto that tab would pop a menu rather than switch the view.

Navigation calls `selectTab(el)` instead, which looks the element up in the registry and runs
that tab's own `select`. The registry exists for the indicator anyway; this is the second
thing it buys.

## Only a tab's own keys drive navigation

`TabList` listens on the container, so every key pressed inside a tab bubbles to it. That was
harmless while a tab held only text. It stops being harmless when a tab holds a menu trigger:
`ArrowDown` to open the menu reached the tablist first, which called `closest('[role="tab"]')`
on the event target, got `-1` from `indexOf`, and jumped to the first tab.

The handler now ignores any event whose target is not itself a tab: `matches()`, not
`closest()`, because the point is to exclude content *inside* a tab, and `closest()` walks up
to the tab from exactly that content.

A second guard covers the trigger itself, which *is* the tab and so passes the first one. On a
vertical tablist `ArrowDown` is both the key that opens a menu and the key that moves to the
next tab, and `Dropdown` prevents the default on the keys it takes without stopping them from
bubbling. So the handler returns early on an event that is already `defaultPrevented`: a
widget closer to the target has claimed that key. One press opens the menu, and only that.

`preventDefault` moved out of the template modifiers and into the handler, after the key is
matched. The modifiers prevented all four arrow keys in both orientations, so a horizontal
tablist swallowed `ArrowDown` and the page would not scroll. Now an unhandled key keeps its
default behaviour. This is a behaviour change, and it is the reason `ArrowDown` can reach a
menu inside a tab at all.

## Two indicator shapes, one default

`TabIndicator` can be an edge rule — a hairline along the side that faces the panel — or a
block sitting behind the active tab. `demo.vue` names both: a "border indicator" and an "item
indicator".

The edge rule is the default in both orientations, and the block is one class away:
`h-full` on a horizontal indicator, `w-full` on a vertical one. The orientation changes which
edge the rule runs along, never which shape it is.

That symmetry was the point of the last change here. The vertical default used to be the
block, so the two orientations disagreed about what a bare `<TabIndicator />` means: a
horizontal consumer added `h-full` to opt *in* to the block, and a vertical one added
`w-[2px]!` to opt *out* of it. Three of the four horizontal call sites in this repo already
passed `h-full` or a fixed height; only one vertical call site wanted the block.

Keeping the edge rule as the default also keeps the colour simple. A rule has nothing behind
it, so it is opaque `bg-primary` in both orientations. A block lands behind the active label,
where an opaque fill would paint `btn-text-primary` text on a `bg-primary` ground and hide it
— so a consumer that asks for the block supplies the tint, which every such call site already
did.

The vertical rule runs along the **right** edge, mirroring the horizontal one along the
bottom: both sit on the side that faces the panel. A leading-edge accent is
`right-auto left-0`.

## Panels match the same way tabs do

`TabPanel` runs the same matcher as `Tab` through `useTabValue`, so a panel can answer to a
multi-value tab. `TabPanels` keys each panel by its primary value, passed through `String()`:
a VNode key accepts a string, a number or a symbol, and `Primitive` also admits `bigint` and
`boolean`. Naming the value is honest where a cast to `string | number` was not.

Only a panel is matched. Any other child of `TabPanels` passes straight through, so a
wrapper or a heading in the slot survives a model change. The two branches have to stay
exclusive: a non-panel child carrying a `value` prop once satisfied both, and rendered
twice.

"A panel" means a direct child, because the test reads the vnode's component name. A `v-for`
over panels produces a fragment, and a fragment is not a panel, so it passes through whole
and every panel inside it renders at once. Flattening fragments the way `Slot.ts` does would
lift that limit; nothing has needed it yet.

Each panel is keyed on every render, not once. `KeepAlive` caches by key and falls back to
the vnode type, which every panel shares, so an unkeyed panel gets no entry of its own. The
keying used to run once in `setup`, over the vnodes of the first render. Any later run of the
slot — a `v-for` or a `v-if` over panels reacting to parent state — built fresh vnodes with no
key, and `keepAlive` silently stopped restoring anything.

## Known limitations

- **A multi-value tab that holds a menu is not a valid tab.** The APG tab pattern wants no
  interactive descendants inside `role="tab"`, and a screen reader announces the nesting
  oddly. The alternative — a menu button beside the tablist, styled to look like a tab —
  loses the indicator and the arrow-key sequence. The trade was taken deliberately; a real
  fix needs the indicator to be able to track an element outside the tablist.
- **Selection follows focus, always.** APG allows manual activation, where an arrow moves
  focus and `Enter` or `Space` commits. Adding it means a second piece of state on the root
  (focused tab versus selected tab) and a `tabindex` that tracks the first one.
- **`duration` on `Tabs` is dead.** It predates the Tailwind transition on `TabIndicator`.
  Removing it is a breaking change for any call site that passes it, and nothing in the repo
  does.
- **Ids collide across types.** `tab-1__x` is produced by both `1` and `'1'`.

## Out of scope

- **Lazy or async panels.** `TabPanels` renders what the slot gives it. A panel that loads on
  demand belongs inside the panel.
- **Scrollable or overflowing tablists.** There is no scroll affordance and no overflow menu.
  The multi-value tab is what this component offers instead, and it is a different thing: a
  deliberate grouping, not an automatic spill.
- **Drag to reorder.**
