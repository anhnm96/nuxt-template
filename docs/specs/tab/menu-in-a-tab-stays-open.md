# A menu inside a tab stays open after the keyboard leaves it

## Problem Statement

The view switcher on `app/pages/playground/tab.vue` puts a `Dropdown` inside the last `Tab`,
so one pill stands for several views and its menu selects between them. Open that menu with
the keyboard, then leave it with the keyboard, and the menu stays on screen over the page.

`Dropdown` dismisses a popover on Escape and on a click outside it. Neither covers a
keyboard exit. The tab carries a `focusout` handler that closes the menu when focus moves
somewhere outside the popover, and that handler is on the **trigger**. Once `ArrowDown` moves
focus into the popover — which `Dropdown` does deliberately, through `manageKeyboard` —
nothing is watching any more. `Tab` out of the last item and the menu is left behind, with
focus somewhere else on the page and no pointer gesture coming to dismiss it.

Arrowing to another tab while the menu is open is handled, because focus is still on the
trigger when that key arrives. The gap is only the exit that starts from inside the popover.

## Solution

Not decided. Two shapes are worth weighing, and the choice turns on whether this belongs to
the page or to `Dropdown`:

- **At the call site.** Watch `focusout` on the popover as well as on the trigger, and close
  when focus lands outside both. It keeps the behaviour where it is wanted, and every later
  menu-in-a-tab repeats it.
- **In `Dropdown`.** A `dismissOnFocusLeave` mode, off by default. `Dropdown` already owns
  focus restore and the Escape contract, so this is the matching piece. It must not fire for
  `Select`, which moves focus into its own search field on open, and the trigger and the
  teleported popover are not in one DOM subtree, so "outside both" has to be asked of two
  elements rather than one container.

Whichever it is, an absent `relatedTarget` must not count as leaving. Safari and Firefox
report no `relatedTarget` for a mouse press on a menu item, and closing then unmounts the
item before its click lands. `app/components/tab/README.md` and
`app/components/base/dropdown/DESIGN.md` describe the surrounding behaviour.

## User Stories

1. As someone who opened a view menu with the keyboard, I want `Tab` out of it to dismiss it,
   so that a menu I have left does not sit over the page.
2. As someone using the menu with a pointer, I want a click on an item to select that view,
   so that the fix for the keyboard does not cost me the mouse.
3. As someone on Safari or Firefox, I want the same selection behaviour as on Chrome, so that
   the switcher is not a different control in each browser.
4. As someone using a `Select`, I want its search field to keep focus when it opens, so that
   a change made for menus does not reach a control that needs focus inside it.
5. As someone who moved from the menu to another tab with the arrow keys, I want the menu
   dismissed, so that the behaviour that works today keeps working.
