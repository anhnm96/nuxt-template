import type { MaybeRefOrGetter, Ref } from 'vue'

/** How an Item's Label / Value / Key / disabled state is read. Mirrors `useCheckbox`'s `valueAdapter`. */
export type SelectAccessor<T, R> = keyof T | ((item: T) => R)

type ElementOf<A> = A extends (infer U)[] ? U : never

type ChildrenOf<I, CK>
  = CK extends keyof I ? ElementOf<I[CK]>
    : CK extends (item: I) => infer R ? ElementOf<R>
      : never

/**
 * The Option type. `items` holds Options directly when flat, or Groups when `itemChildren`
 * is given — in which case the Options are the children, and every other `item*` accessor
 * keys off *them*, not off the Group.
 *
 * Key accessors (`item-value="gameId"`) infer through this in every mode. A *function*
 * accessor needs its parameter typed explicitly (`(g: Game) => g.gameId`); an implicit `g`
 * cannot be contextually typed and silently falls back to whole-Item mode. That limitation
 * predates nesting and applies to the flat form too.
 */
export type SelectOptionType<I, CK> = [CK] extends [undefined] ? I : ChildrenOf<I, CK>

/**
 * The Value `v-model` carries, derived from how `itemValue` was specified.
 * Omitting `itemValue` means the whole Item is the Value.
 */
export type SelectValue<T, VK>
  = VK extends keyof T ? T[VK]
    : VK extends (item: T) => infer R ? R
      : T

/**
 * What `v-model` carries, given the selection mode. `M` is threaded from Select's `multiple`
 * prop, whose `M & boolean` declaration is load-bearing — see that prop's note, or ADR-0003.
 */
export type SelectModel<T, VK, M extends boolean>
  = M extends true ? SelectValue<T, VK>[] : MaybeNull<SelectValue<T, VK>>

/** The normalised view of an Item. See CONTEXT.md — Option. */
export interface SelectOption<T> {
  item: T
  /** Primitive, stable identity. Never compared against Value. */
  key: Key
  /** What `v-model` emits. May be the whole Item. */
  value: any
  label: string
  disabled: boolean
  /** `${selectId}-opt-${index}`, for `aria-activedescendant`. See `toOptionId`. */
  id: string
  /** Display label of the Group this Option belongs to. Empty string means ungrouped. */
  group: string
}

/** A run of Options sharing a Group label. Rendering only — navigation stays flat. */
export interface SelectGroup<T> {
  label: string
  /** `${selectId}-grp-N`, referenced by the group's `aria-labelledby`. */
  id: string
  options: SelectOption<T>[]
}

export interface UseSelectOptions<T> {
  /** Raw `items`: Options when flat, Groups when `itemChildren` is set. */
  items: MaybeRefOrGetter<any[]>
  /** Reads a Group's Options. Its presence is what puts the Select in nested mode. */
  itemChildren?: SelectAccessor<any, T[]>
  itemLabel?: SelectAccessor<T, string>
  itemValue?: SelectAccessor<T, any>
  itemKey?: SelectAccessor<T, Key>
  itemDisabled?: SelectAccessor<T, boolean>
  /**
   * The Group label, read from an element of `items` — the Option itself when flat, the
   * Group object when nested. Omit for an ungrouped Select.
   */
  itemGroup?: SelectAccessor<any, string>
  /** Base id for the control; Option ids derive from it. */
  id: MaybeRefOrGetter<string>
  isOpen: Ref<boolean>
  searchable?: MaybeRefOrGetter<boolean | undefined>
  /** How a Label is matched. Defaults to a case-insensitive substring match. */
  filterFn?: MaybeRefOrGetter<((item: T, query: string) => boolean) | undefined>
  /** The parent narrows `items` itself (server-side search); render them untouched. */
  externalFilter?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  /** The options list is not yet authoritative. Blocks opening when there is nothing to show. */
  loading?: MaybeRefOrGetter<boolean | undefined>
  /** Clears the selection. `Delete`/`Backspace` on the closed trigger calls it. */
  onClear?: () => void
  /** Whether there is anything to clear right now. */
  canClear?: MaybeRefOrGetter<boolean | undefined>
  /** The currently selected Values — zero or one in single mode, many when `multiple`. */
  selectedValues: MaybeRefOrGetter<unknown[]>
  /** The component decides whether this replaces or toggles, and whether to close. */
  onSelect: (option: SelectOption<T>) => void
}

/** How long a Typeahead buffer survives without a keystroke. */
const TYPEAHEAD_RESET_MS = 500
/** `PageUp`/`PageDown` move by a flat count — deterministic, unlike a measured viewport page. */
const PAGE_SIZE = 10

function isPrintableKey(event: KeyboardEvent) {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
}

/**
 * Option ids are derived from the Option's *position*, not its Key.
 *
 * Keys are consumer-supplied and arbitrary: sanitising one into a DOM id can collide
 * (`'a b'` and `'a_b'` both become `a_b`), and in whole-Item mode with `itemKey` omitted
 * every Key stringifies to `[object Object]`, giving every Option the same id. Duplicate
 * ids break `aria-activedescendant` and `getElementById`-based scrolling silently, because
 * the visual highlight compares Keys directly and still looks correct.
 */
function toOptionId(selectId: string, index: number) {
  return `${selectId}-opt-${index}`
}

export function useSelect<T>(options: UseSelectOptions<T>) {
  const query = ref('')
  /**
   * The Active Option is tracked by Key, not index — filtering reorders indices
   * but a Key keeps pointing at the same Option.
   */
  const activeKey = ref<Key | null>(null)

  function read<R>(item: T, accessor: SelectAccessor<T, R> | undefined, fallback: R): R {
    if (accessor === undefined) return fallback
    if (typeof accessor === 'function') return accessor(item)
    return item[accessor] as unknown as R
  }

  /** `read` is typed for Options; Groups are a different shape, so they get their own. */
  function readRaw<R>(raw: any, accessor: SelectAccessor<any, R> | undefined, fallback: R): R {
    if (accessor === undefined) return fallback
    if (typeof accessor === 'function') return accessor(raw)
    return raw[accessor]
  }

  function getLabel(item: T) {
    return String(read<any>(item, options.itemLabel, item))
  }

  function getValue(item: T) {
    return options.itemValue === undefined ? item : read<any>(item, options.itemValue, item)
  }

  function getKey(item: T): Key {
    // `itemKey` defaults to `itemValue`, so in the common primitive case Key === Value
    // and a Value resolves to a Key without `items` being loaded at all.
    const accessor = options.itemKey ?? options.itemValue
    return read<any>(item, accessor, item)
  }

  function toOption(item: T, group: string, index: number): SelectOption<T> {
    const key = getKey(item)
    if (import.meta.dev && key !== null && typeof key === 'object') {
      console.warn(
        '[Select] `itemKey` is required when `itemValue` is omitted: without it the whole '
        + 'Item becomes the Key, so Options cannot be matched by identity and a Value '
        + 'restored from JSON will not resolve.',
        item,
      )
    }
    return {
      item,
      key,
      value: getValue(item),
      label: getLabel(item),
      disabled: read(item, options.itemDisabled, false),
      group,
      id: toOptionId(toValue(options.id), index),
    }
  }

  function readGroupLabel(raw: any) {
    if (options.itemGroup === undefined) return ''
    return String(readRaw<any>(raw, options.itemGroup, '') ?? '')
  }

  /**
   * Flattens the two accepted input shapes into one list of Options.
   *
   * Nested input is expanded here rather than at the call site so that everything downstream
   * — filtering, grouping, keyboard navigation — keeps seeing a single flat array. A Group's
   * own position is preserved, and `groups` below re-clusters by label, so nested input and
   * pre-clustered flat input produce identical output.
   */
  const allOptions = computed<SelectOption<T>[]>(() => {
    const raw = toValue(options.items)
    const children = options.itemChildren
    if (children === undefined) {
      return raw.map((item, index) => toOption(item as T, readGroupLabel(item), index))
    }
    // One counter across all Groups, so ids stay unique once the Groups are flattened.
    let index = 0
    return raw.flatMap((group) => {
      const label = readGroupLabel(group)
      const items = readRaw<T[]>(group, children, []) ?? []
      return items.map(item => toOption(item, label, index++))
    })
  })

  function defaultFilter(option: SelectOption<T>, q: string) {
    return option.label.toLowerCase().includes(q.toLowerCase())
  }

  const matchedOptions = computed(() => {
    const q = query.value.trim()
    // `externalFilter` means the parent owns narrowing; render `items` untouched.
    if (!q || toValue(options.externalFilter)) return allOptions.value
    const fn = toValue(options.filterFn)
    if (fn) return allOptions.value.filter(o => fn(o.item, q))
    return allOptions.value.filter(o => defaultFilter(o, q))
  })

  /**
   * Groups in **first-appearance order**: a Group takes the position of its first member,
   * and Options keep their relative order within it. When `items` are already clustered this
   * is a no-op, so grouping never reorders tidy data. Ungrouped Options form a Group with an
   * empty label, which renders without a header.
   *
   * A Group whose Options are all filtered out disappears entirely — it is built from the
   * matched Options, so an empty Group can never exist.
   */
  const groups = computed<SelectGroup<T>[]>(() => {
    const byLabel = new Map<string, SelectGroup<T>>()
    const ordered: SelectGroup<T>[] = []
    for (const option of matchedOptions.value) {
      let group = byLabel.get(option.group)
      if (!group) {
        group = { label: option.group, id: `${toValue(options.id)}-grp-${ordered.length}`, options: [] }
        byLabel.set(option.group, group)
        ordered.push(group)
      }
      group.options.push(option)
    }
    return ordered
  })

  /**
   * Visible Options — what every keyboard behaviour navigates. Never `items`.
   * Flattened in *visual* order, so arrows and Home/End follow what the user sees.
   */
  const visibleOptions = computed(() => groups.value.flatMap(g => g.options))

  const activeIndex = computed(() => {
    if (activeKey.value === null) return -1
    return visibleOptions.value.findIndex(o => o.key === activeKey.value)
  })

  const activeOption = computed(() => visibleOptions.value[activeIndex.value] ?? null)
  const activeDescendantId = computed(() => activeOption.value?.id)

  /**
   * Resolves a Value to a Key. Matching is always done on Key, never on Value —
   * two structurally-equal Values from different sources are not reference-equal.
   */
  function keyOfValue(value: unknown): Key | null {
    if (isNullish(value)) return null
    // Whole-Item mode: the Value *is* an Item, so the accessor applies directly.
    if (options.itemValue === undefined) return getKey(value as T)
    // Key defaults to Value, so no lookup is needed and no Items need to be loaded.
    if (options.itemKey === undefined) return value as Key
    // A distinct Key accessor means the Value can only be resolved via the Items.
    return allOptions.value.find(o => o.value === value)?.key ?? null
  }

  const selectedKeys = computed(() => {
    const keys = new Set<Key>()
    for (const value of toValue(options.selectedValues)) {
      const key = keyOfValue(value)
      if (key !== null) keys.add(key)
    }
    return keys
  })

  function isSelected(option: SelectOption<T>) {
    return selectedKeys.value.has(option.key)
  }

  // ---------------------------------------------------------------- navigation

  /** Scans from `start` for an enabled Option, then back the other way. Never loops forever. */
  function seekEnabled(start: number, direction: 1 | -1): number {
    const list = visibleOptions.value
    for (let i = start; i >= 0 && i < list.length; i += direction) {
      if (!list[i]!.disabled) return i
    }
    for (let i = start - direction; i >= 0 && i < list.length; i -= direction) {
      if (!list[i]!.disabled) return i
    }
    return -1
  }

  /** Pure state change. Pointer hover uses this: see `navigate` for why it must not scroll. */
  function setActiveIndex(index: number) {
    const option = visibleOptions.value[index]
    activeKey.value = option ? option.key : null
  }

  /**
   * Nothing is focused, so the browser will not reveal the Active Option for us.
   *
   * Only keyboard navigation scrolls. If hovering scrolled too, `block: 'nearest'` would
   * shift the list by a few pixels to reveal a partly-visible row, the next `mousemove`
   * would land on a different option, and the highlight would run ahead of the cursor —
   * making clicks select the wrong row.
   */
  async function scrollActiveIntoView() {
    await nextTick()
    const id = activeDescendantId.value
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'nearest' })
  }

  /** Keyboard-driven move: change the Active Option *and* reveal it. */
  function navigate(index: number) {
    setActiveIndex(index)
    scrollActiveIntoView()
  }

  const firstEnabledIndex = () => seekEnabled(0, 1)
  const lastEnabledIndex = () => seekEnabled(visibleOptions.value.length - 1, -1)

  /** Clamps at the ends — deliberately does not wrap. See docs/specs/select/design.md. */
  function moveActive(delta: number) {
    const list = visibleOptions.value
    if (!list.length) return
    const from = activeIndex.value
    if (from === -1) return navigate(delta > 0 ? firstEnabledIndex() : lastEnabledIndex())
    const target = Math.min(Math.max(from + delta, 0), list.length - 1)
    const found = seekEnabled(target, delta > 0 ? 1 : -1)
    if (found !== -1) navigate(found)
  }

  // ----------------------------------------------------------------- typeahead

  let typeaheadBuffer = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

  /** Moves the Active Option. Never narrows Visible Options — that is Search. */
  function typeahead(char: string) {
    clearTimeout(typeaheadTimer)
    typeaheadBuffer += char.toLowerCase()
    typeaheadTimer = setTimeout(() => {
      typeaheadBuffer = ''
    }, TYPEAHEAD_RESET_MS)

    const list = visibleOptions.value
    if (!list.length) return
    // Typeahead wraps (unlike arrow keys) — it is a jump, not a step.
    const start = activeIndex.value + 1
    for (let n = 0; n < list.length; n++) {
      const option = list[(start + n) % list.length]!
      if (!option.disabled && option.label.toLowerCase().startsWith(typeaheadBuffer)) {
        navigate((start + n) % list.length)
        return
      }
    }
  }

  function resetTypeahead() {
    clearTimeout(typeaheadTimer)
    typeaheadBuffer = ''
  }

  // -------------------------------------------------------------- open / close

  type OpenPosition = 'selected-or-first' | 'selected-or-last' | 'none'

  /**
   * Nothing to show and nothing to do: the popup would be an empty box with a spinner the
   * trigger is already showing. Blocking here (rather than in the click handler) keeps mouse
   * and keyboard consistent — otherwise the Select would refuse to open by click but open on
   * ArrowDown.
   */
  const isBlocked = computed(() =>
    !!toValue(options.loading) && allOptions.value.length === 0)

  /** Positions the Active Option for a freshly-opened popup. */
  function positionOnOpen(position: Exclude<OpenPosition, 'none'>) {
    const selected = visibleOptions.value.findIndex(isSelected)
    if (selected !== -1) return navigate(selected)
    navigate(position === 'selected-or-first' ? firstEnabledIndex() : lastEnabledIndex())
  }

  /**
   * Set by `open()` so the `isOpen` watcher can tell a keyboard open (already positioned,
   * possibly deliberately to nothing) from one it did not drive — a mouse click, which
   * reaches Dropdown directly and never calls in here.
   */
  let openWasHandled = false

  /** Returns whether the popup actually opened; callers must not act on a refused open. */
  function open(position: OpenPosition = 'selected-or-first'): boolean {
    if (toValue(options.disabled) || isBlocked.value) return false
    openWasHandled = true
    options.isOpen.value = true
    if (position === 'none') {
      activeKey.value = null
      return true
    }
    positionOnOpen(position)
    return true
  }

  function close() {
    options.isOpen.value = false
  }

  watch(options.isOpen, (isOpen) => {
    if (!isOpen) {
      // The Search Query resets on close — a stale invisible filter is a confusing state
      // to come back to.
      query.value = ''
      activeKey.value = null
      resetTypeahead()
      openWasHandled = false
      return
    }
    // Opened by something other than `open()` — a mouse click, which Dropdown handles on
    // its own. Position it the way ArrowDown would, so the current selection is highlighted
    // and scrolled into view instead of the list starting at the top.
    if (!openWasHandled) positionOnOpen('selected-or-first')
  })

  // Re-narrowing can strip the Active Option out of view; put it somewhere valid.
  watch(visibleOptions, (list) => {
    if (!options.isOpen.value) return
    if (activeKey.value !== null && list.some(o => o.key === activeKey.value)) return
    navigate(firstEnabledIndex())
  })

  // ------------------------------------------------------------------ keyboard

  function selectActive() {
    const option = activeOption.value
    if (!option || option.disabled) return
    options.onSelect(option)
  }

  function handleClosedKeydown(event: KeyboardEvent, searchable: boolean) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        return open(event.altKey ? 'none' : 'selected-or-first')
      case 'ArrowUp':
        event.preventDefault()
        return open('selected-or-last')
      case 'Enter':
      case ' ':
        event.preventDefault()
        return open()
      case 'Delete':
      case 'Backspace':
        // Unambiguous only while closed: once open there is a query these keys must edit.
        if (!toValue(options.canClear)) return
        event.preventDefault()
        return options.onClear?.()
    }
    if (!isPrintableKey(event)) return
    // A refused open (disabled, or loading with nothing to show) must leave no trace:
    // seeding the query anyway would survive until the *next* close and silently filter
    // the list the first time the user genuinely opens it.
    if (!open('none')) return
    event.preventDefault()
    if (!searchable) return typeahead(event.key)
    // DOM focus is on the trigger, so this keystroke would be swallowed by the
    // search input that is about to take focus. Seed it instead.
    query.value = event.key
  }

  function handleOpenKeydown(event: KeyboardEvent, searchable: boolean) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        return moveActive(1)
      case 'ArrowUp':
        event.preventDefault()
        if (event.altKey) return close()
        return moveActive(-1)
      case 'Home':
        event.preventDefault()
        return navigate(firstEnabledIndex())
      case 'End':
        event.preventDefault()
        return navigate(lastEnabledIndex())
      case 'PageDown':
        event.preventDefault()
        return moveActive(PAGE_SIZE)
      case 'PageUp':
        event.preventDefault()
        return moveActive(-PAGE_SIZE)
      case 'Enter':
        event.preventDefault()
        return selectActive()
      case ' ':
        // When searchable, Space must type a space — otherwise searching "call of duty"
        // selects something mid-word.
        if (searchable) return
        event.preventDefault()
        return selectActive()
      case 'Tab':
        // "Focus moved" and "value changed" are never the same gesture: no commit.
        return close()
    }
    if (!searchable && isPrintableKey(event)) {
      event.preventDefault()
      typeahead(event.key)
    }
    // Escape is handled by Dropdown, which owns popover dismissal for every consumer.
  }

  function handleKeydown(event: KeyboardEvent) {
    if (toValue(options.disabled)) return
    const searchable = toValue(options.searchable) ?? false
    if (options.isOpen.value) return handleOpenKeydown(event, searchable)
    handleClosedKeydown(event, searchable)
  }

  return {
    query,
    allOptions,
    groups,
    visibleOptions,
    isBlocked,
    activeKey,
    activeOption,
    activeDescendantId,
    selectedKeys,
    isSelected,
    keyOfValue,
    getLabel,
    open,
    close,
    setActiveIndex,
    handleKeydown,
  }
}

export type UseSelectReturn<T> = ReturnType<typeof useSelect<T>>
