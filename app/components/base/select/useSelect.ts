import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ListGroup, ListOption, OptionAccessor, OptionTypeOf, OptionValueOf } from '~/composables/useOptionList'

/**
 * The option-list model — Items to Options, filtering, Groups, Visible Options and the Active
 * Option — lives in `useOptionList`, which `Autocomplete` shares. What stays here is the policy
 * this widget applies to it: who owns the Query, when the popup may open, and the keymap.
 * See ADR-0012.
 */

/** How an Item's Label / Value / Key / disabled state is read. */
export type SelectAccessor<T, R> = OptionAccessor<T, R>

/** The Option type. See `OptionTypeOf` for why a function accessor needs an explicit parameter. */
export type SelectOptionType<I, CK> = OptionTypeOf<I, CK>

/**
 * The Value `v-model` carries, derived from how `itemValue` was specified.
 * Omitting `itemValue` means the whole Item is the Value.
 */
export type SelectValue<T, VK> = OptionValueOf<T, VK>

/**
 * What `v-model` carries, given the selection mode. `M` is threaded from Select's `multiple`
 * prop, whose `M & boolean` declaration is load-bearing — see that prop's note, or ADR-0003.
 */
export type SelectModel<T, VK, M extends boolean>
  = M extends true ? SelectValue<T, VK>[] : MaybeNull<SelectValue<T, VK>>

/** The normalised view of an Item. See CONTEXT.md — Option. */
export type SelectOption<T> = ListOption<T>

/** A run of Options sharing a Group label. Rendering only — navigation stays flat. */
export type SelectGroup<T> = ListGroup<T>

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

function isPrintableKey(event: KeyboardEvent) {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
}

export function useSelect<T>(options: UseSelectOptions<T>) {
  /** The Search Query. Internal, and reset on close — see the `isOpen` watcher. */
  const query = ref('')

  const list = useOptionList<T>({
    items: () => toValue(options.items),
    get itemChildren() {
      return options.itemChildren
    },
    get itemLabel() {
      return options.itemLabel
    },
    get itemValue() {
      return options.itemValue
    },
    get itemKey() {
      return options.itemKey
    },
    get itemDisabled() {
      return options.itemDisabled
    },
    get itemGroup() {
      return options.itemGroup
    },
    id: options.id,
    query,
    filterFn: () => toValue(options.filterFn),
    // `externalFilter` means the parent owns narrowing; render `items` untouched.
    skipFilter: () => toValue(options.externalFilter),
    selectedValues: () => toValue(options.selectedValues),
    // Arrows clamp here where a Menu wraps. See DESIGN.md — "Clamp, not wrap".
    loop: false,
    // A Search field owns the printable keys wherever there is one.
    typeahead: () => !(toValue(options.searchable) ?? false),
    componentName: 'Select',
  })

  const { allOptions, groups, visibleOptions, activeKey, activeIndex, activeOption, activeDescendantId, keyOfValue, selectedKeys, isSelected, setActiveIndex, navigate, nav } = list

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
    navigate(position === 'selected-or-first' ? nav.firstEnabled() : nav.lastEnabled())
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
      nav.resetTypeahead()
      openWasHandled = false
      return
    }
    // Opened by something other than `open()` — a mouse click, which Dropdown handles on
    // its own. Position it the way ArrowDown would, so the current selection is highlighted
    // and scrolled into view instead of the list starting at the top.
    if (!openWasHandled) positionOnOpen('selected-or-first')
  })

  // Re-narrowing can strip the Active Option out of view; put it somewhere valid.
  watch(visibleOptions, () => {
    if (!options.isOpen.value) return
    // `activeIndex` is already scanning the new list for this answer, and the template reads
    // it through `activeDescendantId` on the same tick. A `some()` here would be a second
    // pass for a result about to be cached.
    if (activeIndex.value !== -1) return
    navigate(nav.firstEnabled())
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
    if (!searchable) return nav.typeahead(event.key)
    // DOM focus is on the trigger, so this keystroke would be swallowed by the
    // search input that is about to take focus. Seed it instead.
    query.value = event.key
  }

  function handleOpenKeydown(event: KeyboardEvent, searchable: boolean) {
    switch (event.key) {
      case 'ArrowUp':
        // Caught before the shared keymap, which would read the arrow as a move.
        if (event.altKey) {
          event.preventDefault()
          return close()
        }
        break
      // `Home` and `End` do not go through the shared keymap, which ignores an edge it
      // cannot reach. Passing `-1` on to `navigate` is what clears the Active Option when
      // every Visible Option is disabled.
      case 'Home':
        event.preventDefault()
        return navigate(nav.firstEnabled())
      case 'End':
        event.preventDefault()
        return navigate(nav.lastEnabled())
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
    // The arrows, the page keys and Typeahead. It prevents the default on what it takes and
    // leaves everything else alone, including every printable key while searchable.
    nav.handleKeydown(event)
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
    activeDescendantId,
    selectedKeys,
    isSelected,
    keyOfValue,
    open,
    close,
    setActiveIndex,
    handleKeydown,
  }
}

export type UseSelectReturn<T> = ReturnType<typeof useSelect<T>>
