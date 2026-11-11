const tabStopSelector = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'object',
  'embed',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',')

function isTabStop(element: HTMLElement) {
  // `tabIndex < 0` is load-bearing. A roving-tabindex widget such as `Calendar` matches the
  // selector with every cell, but only one cell is tabbable. A `tabindex="-1"` cell is not a
  // boundary of the tab order. Without this filter, Tab from the real cell matches neither
  // boundary, and focus leaves a trap.
  // `[disabled]` also excludes a non-form element that carries the attribute.
  if (element.tabIndex < 0 || element.matches(':disabled, [disabled]') || element.closest('[inert], [hidden]')) return false
  // Older browsers lack `checkVisibility`.
  if (element.checkVisibility) return element.checkVisibility({ visibilityProperty: true })

  const { visibility } = getComputedStyle(element)
  if (visibility === 'hidden' || visibility === 'collapse') return false
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
    if (getComputedStyle(parent).display === 'none') return false
  }
  return true
}

function isNamedRadio(element: HTMLElement): element is HTMLInputElement {
  return element instanceof HTMLInputElement && element.type === 'radio' && Boolean(element.name)
}

interface TabScan {
  candidates: HTMLElement[]
  radios: HTMLInputElement[]
  checkedRadios: HTMLInputElement[]
}

function scanTabStops(container: HTMLElement): TabScan {
  const tabOrder = (element: HTMLElement) => element.tabIndex || Number.MAX_SAFE_INTEGER
  const candidates = [...container.querySelectorAll<HTMLElement>(tabStopSelector)]
    .filter(isTabStop)
    .sort((a, b) => tabOrder(a) - tabOrder(b))

  const radios = candidates.filter(isNamedRadio)
  if (!radios.length) return { candidates, radios, checkedRadios: [] }

  const root = container.getRootNode() as Document | DocumentFragment | HTMLElement
  const checkedRadios = [...root.querySelectorAll<HTMLInputElement>('input:checked')]
    .filter(isNamedRadio)
    .filter(isTabStop)
  return { candidates, radios, checkedRadios }
}

function collapseRadioGroups({ candidates, radios, checkedRadios }: TabScan, backwards: boolean) {
  if (!radios.length) return candidates

  // A radio group contributes one stop. An unchecked group takes focus at the
  // end the user enters from, unless a radio in that group already has focus.
  return candidates.filter((element) => {
    if (!isNamedRadio(element)) return true
    const inGroup = (radio: HTMLInputElement) => radio.name === element.name && radio.form === element.form
    const group = radios.filter(inGroup)
    const focused = group.find(radio => radio.matches(':focus'))
    const stop = focused ?? checkedRadios.find(inGroup) ?? (backwards ? group.at(-1) : group[0])
    return element === stop
  })
}

/**
 * The elements in `container` that Tab visits, in the order the browser visits them.
 * The list leaves out disabled, hidden, inert and invisible elements.
 *
 * A named radio group is one stop, as in the browser. `backwards` picks the end of an
 * unchecked group that Tab enters from: the first radio going forward, the last going back.
 */
export function getTabStops(container: HTMLElement, backwards = false) {
  return collapseRadioGroups(scanTabStops(container), backwards)
}

/**
 * The first and last stops, each as the browser enters it: `first` is where a forward Tab
 * arrives, and `last` is where Shift+Tab arrives. Scans `container` once.
 */
export function getTabEnds(container: HTMLElement) {
  const scan = scanTabStops(container)
  return { first: collapseRadioGroups(scan, false)[0], last: collapseRadioGroups(scan, true).at(-1) }
}
