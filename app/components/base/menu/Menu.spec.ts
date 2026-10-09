import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Menu from './Menu.vue'
import MenuGroup from './MenuGroup.vue'
import MenuItem from './MenuItem.vue'
import MenuSeparator from './MenuSeparator.vue'

/**
 * Every helper queries the whole document, because roving focus lives in the DOM rather
 * than in component state. Mounts are `attachTo: document.body`, so they have to be torn
 * down or the next test reads the previous menu's items.
 */
const mounted: { unmount: () => void }[] = []

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.body.innerHTML = ''
})

function mountHost(component: any) {
  const wrapper = mount(component, { attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

/**
 * A Menu with no Host. `injectPopoverContext` falls back to `NO_POPOVER`, so dismissal is a
 * no-op and the Menu still works — which is itself worth having covered.
 */
function mountMenu(slot: () => any, props: Record<string, any> = {}) {
  return mountHost(defineComponent({
    render: () => h(Menu, { label: 'Actions', ...props }, { default: slot }),
  }))
}

/** A Menu under a Host that records dismissal. */
function mountHostedMenu(slot: () => any, dismiss: () => void) {
  return mountHost(defineComponent({
    setup() {
      providePopoverContext({ dismiss })
      return () => h(Menu, { label: 'Actions' }, { default: slot })
    },
  }))
}

function items() {
  return [...document.querySelectorAll<HTMLElement>('[role^="menuitem"]')]
}

function labels() {
  return items().map(el => el.textContent?.trim())
}

function focusedLabel() {
  const active = document.activeElement as HTMLElement | null
  return active?.getAttribute('role')?.startsWith('menuitem')
    ? active.textContent?.trim()
    : undefined
}

function tabStopLabel() {
  return items().find(el => el.tabIndex === 0)?.textContent?.trim()
}

/**
 * Dispatches an event the way a user would, and waits for the result.
 *
 * The clock has to move first. Vue's event invoker stamps the first event it sees with
 * `e._vts = Date.now()`, and any invoker attached at or before that stamp then returns
 * early (`runtime-dom`: `else if (e._vts <= invoker.attached) return`). An event dispatched
 * in the same millisecond as the mount is therefore dropped by every listener except the
 * first one to see it — so handlers on the target element fire, while anything that relies
 * on bubbling silently does not. A user cannot press a key that fast; a test can, and it
 * made `Tab` and Typeahead fail about 40% of runs.
 */
async function dispatch(target: EventTarget, event: Event) {
  const start = Date.now()
  while (Date.now() === start) await new Promise(resolve => setTimeout(resolve, 1))
  target.dispatchEvent(event)
  await nextTick()
}

/** Keydown goes to the focused item, as a real keypress would, and bubbles to the Menu. */
async function press(key: string, init: KeyboardEventInit = {}) {
  const target = (document.activeElement as HTMLElement | null) ?? document.body
  await dispatch(target, new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
}

/** Click the way a user would, through the same clock guard as `press`. */
async function click(target: EventTarget) {
  await dispatch(target, new MouseEvent('click', { bubbles: true }))
}

/**
 * Binding `checked` at all is what makes a row a Checked Item, so the three cases below are
 * the component's whole role contract.
 *
 * This is not a decorative test. Vue resolves an *absent* `Boolean` prop to `false` unless
 * the prop declares a default, so without `checked: undefined` in `withDefaults` every
 * plain command row silently becomes a `menuitemradio` announced as "not checked". Nothing
 * about the rendered menu looks wrong. ADR-0002 records the same casting rule biting Select.
 */
describe('menuItem — checked is bind-detected', () => {
  it('is a plain menuitem when `checked` is not bound', () => {
    mountMenu(() => [h(MenuItem, null, () => 'Add')])
    expect(items()[0]!.getAttribute('role')).toBe('menuitem')
    expect(items()[0]!.hasAttribute('aria-checked')).toBe(false)
  })

  it('is a menuitemradio when `checked` is bound false', () => {
    mountMenu(() => [h(MenuItem, { checked: false }, () => 'Left')])
    expect(items()[0]!.getAttribute('role')).toBe('menuitemradio')
    expect(items()[0]!.getAttribute('aria-checked')).toBe('false')
  })

  it('is a checked menuitemradio when `checked` is bound true', () => {
    mountMenu(() => [h(MenuItem, { checked: true }, () => 'Center')])
    expect(items()[0]!.getAttribute('role')).toBe('menuitemradio')
    expect(items()[0]!.getAttribute('aria-checked')).toBe('true')
  })

  it('reserves the tick gutter only on Checked Items', () => {
    mountMenu(() => [
      h(MenuItem, null, () => 'Command'),
      h(MenuItem, { checked: false }, () => 'Radio'),
    ])
    expect(items()[0]!.querySelector('.menu-item-check')).toBeNull()
    expect(items()[1]!.querySelector('.menu-item-check')).not.toBeNull()
  })
})

describe('menu — the roving tabindex', () => {
  it('puts exactly one item in the tab order', () => {
    mountMenu(() => [
      h(MenuItem, null, () => 'One'),
      h(MenuItem, null, () => 'Two'),
      h(MenuItem, null, () => 'Three'),
    ])
    expect(items().filter(el => el.tabIndex === 0)).toHaveLength(1)
    expect(items().filter(el => el.tabIndex === -1)).toHaveLength(2)
  })

  it('opens on the Checked Item, not the first row', () => {
    // The font-size menu showing `11` must open on `11`. Mirrors Select's `positionOnOpen`.
    mountMenu(() => [
      h(MenuItem, { checked: false }, () => '8'),
      h(MenuItem, { checked: false }, () => '10'),
      h(MenuItem, { checked: true }, () => '11'),
      h(MenuItem, { checked: false }, () => '12'),
    ])
    expect(tabStopLabel()).toBe('11')
  })

  it('opens on the first enabled row when nothing is checked', () => {
    mountMenu(() => [
      h(MenuItem, { disabled: true }, () => 'Undo'),
      h(MenuItem, null, () => 'Redo'),
    ])
    expect(tabStopLabel()).toBe('Redo')
  })

  it('takes focus when a Host opened it', async () => {
    /**
     * A Menu only mounts inside a popover once that popover opens, so mounting *is* the
     * open — and APG's menu-button pattern puts focus on an item then. Without this a
     * click-opened menu leaves focus on the trigger, and because the popover is teleported
     * the keystrokes never reach the Menu: Typeahead does nothing until the user presses
     * an arrow or hovers a row.
     */
    mountHostedMenu(() => [
      h(MenuItem, { checked: false }, () => '8'),
      h(MenuItem, { checked: true }, () => '11'),
    ], () => {})
    await nextTick()
    expect(focusedLabel()).toBe('11')
  })

  it('does not steal focus when there is no Host', async () => {
    // Rendered inline, mounting means nothing was opened. ADR-0005 records this biting an
    // inline `<Calendar>` that grabbed the page's focus the moment it rendered.
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()

    mountMenu(() => [h(MenuItem, null, () => 'Add')])
    await nextTick()

    expect(document.activeElement).toBe(outside)
  })

  it('becomes its own tab stop when no item can hold focus', async () => {
    /**
     * Otherwise the Menu opens with focus still outside it, and the Host handles `Escape`
     * on an element that never receives a keypress — so a keyboard user cannot dismiss it.
     * Reachable in `pages/group.vue`: a deepest-level row with live descendants disables
     * both of its items. The Calendar panels take the same fallback (ADR-0005).
     */
    mountMenu(() => [
      h(MenuItem, { disabled: true }, () => 'Add'),
      h(MenuItem, { disabled: true }, () => 'Delete'),
    ])
    // `needsOwnTabStop` is settled in `onMounted`, so the attribute lands a render later.
    await nextTick()
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!
    expect(menu.tabIndex).toBe(0)
    expect(items().every(el => el.tabIndex === -1)).toBe(true)
  })

  it('stays out of the tab order while an item can hold focus', () => {
    mountMenu(() => [
      h(MenuItem, { disabled: true }, () => 'Add'),
      h(MenuItem, null, () => 'Delete'),
    ])
    expect(document.querySelector('[role="menu"]')!.hasAttribute('tabindex')).toBe(false)
  })

  it('focus() falls back to the Menu itself when every item is disabled', async () => {
    const wrapper = mountMenu(() => [h(MenuItem, { disabled: true }, () => 'Add')])
    wrapper.findComponent(Menu).vm.focus()
    await nextTick()
    expect(document.activeElement).toBe(document.querySelector('[role="menu"]'))
  })

  it('hands focus on when it stops being its own tab stop', async () => {
    /**
     * A browser blurs an element whose `tabindex` goes away, so clearing the fallback while
     * the Menu holds focus drops focus to `<body>` — where neither the Menu's own keys nor
     * the Host's `Escape` arrive, which is the dead end the fallback exists to prevent.
     */
    const locked = ref(true)
    mountHostedMenu(() => [
      h(MenuItem, { disabled: true }, () => 'Add'),
      h(MenuItem, { disabled: locked.value }, () => 'Delete'),
    ], () => {})
    await nextTick()
    expect(document.activeElement).toBe(document.querySelector('[role="menu"]'))

    locked.value = false
    await nextTick()
    expect(focusedLabel()).toBe('Delete')
    expect(document.querySelector('[role="menu"]')!.hasAttribute('tabindex')).toBe(false)
  })

  it('leaves focus on a row that merely became disabled', async () => {
    // Arrowing still works from it, and jumping to the top of the Menu would be worse.
    const locked = ref(false)
    mountHostedMenu(() => [
      h(MenuItem, null, () => 'One'),
      h(MenuItem, { disabled: locked.value }, () => 'Two'),
    ], () => {})
    items()[1]!.focus()
    await nextTick()
    locked.value = true
    await nextTick()
    expect(focusedLabel()).toBe('Two')
  })

  it('moves the tab stop to whatever takes focus', async () => {
    mountMenu(() => [
      h(MenuItem, null, () => 'One'),
      h(MenuItem, null, () => 'Two'),
    ])
    items()[1]!.focus()
    await nextTick()
    expect(tabStopLabel()).toBe('Two')
    expect(items()[0]!.tabIndex).toBe(-1)
  })
})

describe('menu — keyboard navigation', () => {
  function mountThree() {
    return mountMenu(() => [
      h(MenuItem, null, () => 'Alpha'),
      h(MenuItem, { disabled: true }, () => 'Beta'),
      h(MenuItem, null, () => 'Gamma'),
    ])
  }

  it('steps past a disabled item', async () => {
    mountThree()
    items()[0]!.focus()
    await press('ArrowDown')
    expect(focusedLabel()).toBe('Gamma')
  })

  it('wraps at the end, unlike Select', async () => {
    // ADR-0009: a menu loops and a listbox clamps; each follows its own APG pattern.
    mountThree()
    items()[2]!.focus()
    await press('ArrowDown')
    expect(focusedLabel()).toBe('Alpha')
  })

  it('wraps backwards at the start', async () => {
    mountThree()
    items()[0]!.focus()
    await press('ArrowUp')
    expect(focusedLabel()).toBe('Gamma')
  })

  it('Home and End reach the ends without wrapping past them', async () => {
    mountThree()
    items()[0]!.focus()
    await press('End')
    expect(focusedLabel()).toBe('Gamma')
    await press('Home')
    expect(focusedLabel()).toBe('Alpha')
  })

  it('steps over a separator without counting it', async () => {
    mountMenu(() => [
      h(MenuItem, null, () => 'Cut'),
      h(MenuSeparator),
      h(MenuItem, null, () => 'Delete'),
    ])
    expect(labels()).toEqual(['Cut', 'Delete'])
    items()[0]!.focus()
    await press('ArrowDown')
    expect(focusedLabel()).toBe('Delete')
  })

  it('jumps by Typeahead, matching the label', async () => {
    mountMenu(() => [
      h(MenuItem, null, () => 'Copy'),
      h(MenuItem, null, () => 'Paste'),
      h(MenuItem, null, () => 'Duplicate'),
    ])
    items()[0]!.focus()
    await press('d')
    expect(focusedLabel()).toBe('Duplicate')
  })

  it('matches the `label` prop rather than the rendered text', async () => {
    // A row of icon + text reads as whitespace-padded junk; `label` is the escape hatch.
    mountMenu(() => [
      h(MenuItem, null, () => 'Copy'),
      h(MenuItem, { label: 'Zebra' }, () => h('span', ' Paste ')),
    ])
    items()[0]!.focus()
    await press('z')
    expect(focusedLabel()).toBe('Paste')
  })
})

describe('menuGroup', () => {
  function groups() {
    return [...document.querySelectorAll<HTMLElement>('[role="group"]')]
  }

  /** The Group's accessible name, resolved through `aria-labelledby`. */
  function groupName(group: HTMLElement) {
    const id = group.getAttribute('aria-labelledby')
    return id ? document.getElementById(id)?.textContent?.trim() : undefined
  }

  it('names the Group from its heading, and hides the heading from the reader', () => {
    mountMenu(() => [
      h(MenuGroup, { label: 'Size' }, () => [h(MenuItem, { checked: true }, () => '11')]),
    ])
    const group = groups()[0]!
    expect(groupName(group)).toBe('Size')
    // Referenced rather than read in place, or it is announced twice.
    const heading = document.querySelector('[data-slot="menu-group-label"]')
    expect(heading?.getAttribute('aria-hidden')).toBe('true')
  })

  it('takes a name from elsewhere without drawing a heading', () => {
    mountMenu(() => [
      h('span', { id: 'outside' }, 'Alignment'),
      h(MenuGroup, { labelledBy: 'outside' }, () => [h(MenuItem, null, () => 'Left')]),
    ])
    expect(groups()[0]!.getAttribute('aria-labelledby')).toBe('outside')
    expect(document.querySelector('[data-slot="menu-group-label"]')).toBeNull()
  })

  it('is still a group when it is unnamed', () => {
    // The Menu's own label carries the context when the whole Menu is one set.
    mountMenu(() => [h(MenuGroup, null, () => [h(MenuItem, null, () => 'Left')])])
    expect(groups()).toHaveLength(1)
    expect(groups()[0]!.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('keeps the heading out of the navigable items', () => {
    mountMenu(() => [
      h(MenuGroup, { label: 'Size' }, () => [
        h(MenuItem, null, () => '11'),
        h(MenuItem, null, () => '12'),
      ]),
    ])
    expect(labels()).toEqual(['11', '12'])
  })

  it('navigates across a Group boundary as if the Groups were not there', async () => {
    mountMenu(() => [
      h(MenuGroup, { label: 'Size' }, () => [h(MenuItem, null, () => '11')]),
      h(MenuGroup, { label: 'Align' }, () => [h(MenuItem, null, () => 'Left')]),
    ])
    items()[0]!.focus()
    await press('ArrowDown')
    expect(focusedLabel()).toBe('Left')
    // And it still wraps, over both Groups rather than within one.
    await press('ArrowDown')
    expect(focusedLabel()).toBe('11')
  })

  it('reaches a Typeahead match in another Group', async () => {
    mountMenu(() => [
      h(MenuGroup, { label: 'Size' }, () => [h(MenuItem, null, () => '11')]),
      h(MenuGroup, { label: 'Align' }, () => [h(MenuItem, null, () => 'Justify')]),
    ])
    items()[0]!.focus()
    await press('j')
    expect(focusedLabel()).toBe('Justify')
  })

  it('opens on a Checked Item nested in a Group', () => {
    mountMenu(() => [
      h(MenuGroup, { label: 'Size' }, () => [
        h(MenuItem, { checked: false }, () => '8'),
        h(MenuItem, { checked: true }, () => '11'),
      ]),
    ])
    expect(tabStopLabel()).toBe('11')
  })

  it('bounds two radio sets separately', () => {
    // The reason this component exists: without the wrapper both sets read as one run.
    mountMenu(() => [
      h(MenuGroup, { label: 'Size' }, () => [h(MenuItem, { checked: true }, () => '11')]),
      h(MenuGroup, { label: 'Align' }, () => [h(MenuItem, { checked: true }, () => 'Left')]),
    ])
    expect(groups().map(groupName)).toEqual(['Size', 'Align'])
    expect(groups().map(g => g.querySelectorAll('[role="menuitemradio"]').length)).toEqual([1, 1])
  })
})

describe('menu — activation', () => {
  it('emits select and dismisses its Host', async () => {
    const dismiss = vi.fn()
    const onSelect = vi.fn()
    mountHostedMenu(() => [h(MenuItem, { onSelect }, () => 'Add')], dismiss)

    await click(items()[0]!)
    expect(onSelect).toHaveBeenCalledOnce()
    expect(dismiss).toHaveBeenCalledOnce()
  })

  it('does not activate a disabled item', async () => {
    const onSelect = vi.fn()
    mountMenu(() => [h(MenuItem, { disabled: true, onSelect }, () => 'Delete')])
    await click(items()[0]!)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('activates on Enter', async () => {
    const onSelect = vi.fn()
    mountMenu(() => [h(MenuItem, { onSelect }, () => 'Add')])
    items()[0]!.focus()
    await press('Enter')
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('activates on Space rather than starting a Typeahead', async () => {
    // `useListNavigation` excludes Space from Typeahead precisely so this works.
    const onSelect = vi.fn()
    mountMenu(() => [h(MenuItem, { onSelect }, () => 'Add')])
    items()[0]!.focus()
    await press(' ')
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it.each([
    ['Shift+F10', { key: 'F10', shiftKey: true }],
    ['the context-menu key', { key: 'ContextMenu' }],
  ])('swallows %s rather than letting the browser open its own menu', async (_name, init) => {
    /**
     * The popover is teleported, so this keypress never reaches an element whose handler
     * could cancel it — a Host cannot help. Left alone the browser opens its own context
     * menu on top of an already-open Menu, and the user sees two at once.
     *
     * `cancelable` matters: a `KeyboardEvent` is not cancelable by default, so without it
     * `preventDefault()` is a no-op and this would pass whatever the component did.
     */
    const onSelect = vi.fn()
    mountMenu(() => [h(MenuItem, { onSelect }, () => 'Add')])
    items()[0]!.focus()

    const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
    await dispatch(document.activeElement!, event)

    expect(event.defaultPrevented).toBe(true)
    expect(onSelect).not.toHaveBeenCalled()
    expect(focusedLabel()).toBe('Add')
  })

  it('Tab dismisses without activating', async () => {
    const dismiss = vi.fn()
    const onSelect = vi.fn()
    mountHostedMenu(() => [h(MenuItem, { onSelect }, () => 'Add')], dismiss)

    expect(items()).toHaveLength(1)
    items()[0]!.focus()
    expect(focusedLabel()).toBe('Add')
    await press('Tab')
    expect(dismiss).toHaveBeenCalledOnce()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
