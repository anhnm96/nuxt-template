import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ListGroup, ListOption, OptionAccessor, OptionTypeOf, OptionValueOf } from '~/composables/useOptionList'

/**
 * The option-list model — Items to Options, filtering, Groups, Visible Options and the Active
 * Option — lives in `useOptionList`, which `Select` shares. What stays here is the policy this
 * widget applies to it: the two models and the (A) invariant between them, the Last Commit and
 * Abandon, when the popup opens, and the keymap. See ADR-0012.
 */

/** How an Item's Label / Value / Key / disabled state is read. */
export type AutocompleteAccessor<T, R> = OptionAccessor<T, R>

/** The Option type. See `OptionTypeOf` for why a function accessor needs an explicit parameter. */
export type AutocompleteOptionType<I, CK> = OptionTypeOf<I, CK>

/**
 * The Value `v-model` carries, derived from how `itemValue` was specified.
 * Omitting `itemValue` means the whole Item is the Value.
 */
export type AutocompleteValue<T, VK> = OptionValueOf<T, VK>

/**
 * What `v-model` carries. Always nullable and never an array: `freeform` does not narrow it,
 * because the Query is a model of its own. See ADR-0012 — "Two models, not one".
 */
export type AutocompleteModel<T, VK> = MaybeNull<AutocompleteValue<T, VK>>

/** The normalised view of an Item. See CONTEXT.md — Option. */
export type AutocompleteOption<T> = ListOption<T>

/** A run of Options sharing a Group label. Rendering only — navigation stays flat. */
export type AutocompleteGroup<T> = ListGroup<T>

/** Where the Active Option lands when the popup opens. See `positionOnOpen`. */
export type OpenPosition = 'selected-or-first' | 'selected-or-last' | 'selected-or-none' | 'none'

export interface UseAutocompleteOptions<T> {
  /** Raw `items`: Options when flat, Groups when `itemChildren` is set. */
  items: MaybeRefOrGetter<any[]>
  itemChildren?: AutocompleteAccessor<any, T[]>
  itemLabel?: AutocompleteAccessor<T, string>
  itemValue?: AutocompleteAccessor<T, any>
  itemKey?: AutocompleteAccessor<T, Key>
  itemDisabled?: AutocompleteAccessor<T, boolean>
  itemGroup?: AutocompleteAccessor<any, string>
  /** Base id for the control; Option ids derive from it. */
  id: MaybeRefOrGetter<string>
  isOpen: Ref<boolean>
  /**
   * The Query — the input's visible text, owned by the component's `v-model:query`. Unlike a
   * Select's Search Query it survives the popup closing. See CONTEXT.md — Query.
   */
  query: Ref<string>
  /** How a Label is matched. Defaults to a case-insensitive substring match. */
  filterFn?: MaybeRefOrGetter<((item: T, query: string) => boolean) | undefined>
  /** The parent narrows `items` itself (server-side search); render them untouched. */
  externalFilter?: MaybeRefOrGetter<boolean | undefined>
  /** A Dirty Query survives Abandon and stands as the value. See CONTEXT.md — Freeform. */
  freeform?: MaybeRefOrGetter<boolean | undefined>
  /** Whether typing highlights the first prefix-matching Option. Defaults to `!freeform`. */
  autoHighlight?: MaybeRefOrGetter<boolean | undefined>
  /**
   * The options list is not yet authoritative. Unlike Select this never refuses to open: the
   * keystroke that starts the request is the same one that should show the popup. See ADR-0012.
   */
  loading?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  /** Reads the model. */
  selectedValue: MaybeRefOrGetter<unknown>
  /** Writes the model. The composable never holds the Value itself. */
  onValueChange: (value: unknown) => void
}

/** The movement keys this widget forwards. `Home`/`End` are caret keys — see ADR-0012. */
const NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])

export function useAutocomplete<T>(options: UseAutocompleteOptions<T>) {
  const query = options.query

  /** Whether the model currently holds anything. Drives both filtering and Abandon. */
  const hasValue = computed(() => !isNullish(toValue(options.selectedValue)))

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
    /**
     * `externalFilter` means the parent owns narrowing. A Value means something else: the (A)
     * invariant guarantees the Query is an *echo* of its Label, not a search, so filtering by
     * it would narrow a filled field to the one Option already chosen and the chevron would
     * browse nothing.
     */
    skipFilter: () => !!toValue(options.externalFilter) || hasValue.value,
    selectedValues: () => {
      const value = toValue(options.selectedValue)
      return isNullish(value) ? [] : [value]
    },
    // Arrows clamp here where a Menu wraps, matching Select.
    loop: false,
    // The input owns every printable key, so there is no Typeahead. See CONTEXT.md — Query.
    typeahead: false,
    componentName: 'Autocomplete',
  })

  const { allOptions, groups, visibleOptions, activeKey, activeIndex, activeOption, activeDescendantId, keyOfValue, isSelected, setActiveIndex, navigate, nav } = list

  /** The Option behind the current Value, once `items` can resolve it. */
  const selectedOption = computed(() => allOptions.value.find(isSelected) ?? null)

  // ----------------------------------------------------------------- the model

  /**
   * The Last Commit — see CONTEXT.md. Recorded by watching the resolved selection rather than
   * by hooking `commit`, so a Value supplied by the parent, or one whose Item only arrives
   * with a later `items`, is remembered too.
   *
   * Typing does not clear it: a Value nulled under (A) is exactly the state it exists to undo.
   * `clear()` discards it, and so does the consumer clearing the Value — see `writeValue`.
   */
  const lastCommit = shallowRef<AutocompleteOption<T> | null>(null)
  watch(selectedOption, (option) => {
    if (option) lastCommit.value = option
  }, { immediate: true })

  /**
   * The same memory one layer down: the last non-null Value, whether or not an Item ever
   * resolved it. `lastCommit` can only hold Options that exist, so a Value set before its
   * Items arrive leaves it empty — and Abandon would then clear a field the consumer had
   * filled, destroying a Value for a window the consumer created correctly by loading `items`
   * asynchronously. Restoring it puts the field back exactly where it was, Query included:
   * empty, because nothing knows the Label yet. The `selectedOption` watcher writes the Label
   * as soon as the Items land.
   *
   * Seeded rather than watched `immediate`, because the watcher below has a branch that must
   * not run on the first tick: a consumer restoring a saved Query with no Value would have it
   * wiped before anyone typed.
   */
  const initialValue = toValue(options.selectedValue)
  let lastCommittedValue: unknown = isNullish(initialValue) ? undefined : initialValue

  /**
   * Every write to the model goes through here, so the watcher below can tell this component's
   * writes from the parent's. Identity is enough to compare on: a self-write always passes the
   * exact Value it read from an Option or from `lastCommittedValue`.
   */
  let selfWritten: { value: unknown } | null = null
  function writeValue(value: unknown) {
    selfWritten = { value }
    options.onValueChange(value)
  }

  watch(() => toValue(options.selectedValue), (value, previous) => {
    const wasSelfWrite = selfWritten !== null && selfWritten.value === value
    selfWritten = null

    if (!isNullish(value)) {
      lastCommittedValue = value
      return
    }
    // Typing clears the Value under (A). The Query is the user's text, and both memories are
    // exactly what Abandon exists to put back.
    if (wasSelfWrite) return
    // `undefined` to `null` is a form normalising its shape, not a Value being taken away.
    // Only something that *was* there can be cleared.
    if (isNullish(previous)) return

    /**
     * The parent cleared it — a form reset, or a dependent field swapping its dataset. The
     * Query is now the Label of a Value that no longer exists, so leaving it would show a
     * filled field over an empty model, and the Dirty Query it creates would make the next
     * Abandon restore the very Value the parent cleared.
     *
     * Discarding both memories is also what keeps a dataset swap honest: the Option and the
     * Value remembered from the old `items` can no longer be restored over the new ones. The
     * component cannot detect a swap on its own — under `externalFilter` every search replaces
     * `items`, and a Last Commit missing from the current results is the normal case there —
     * so the parent resetting the model is the only signal available, and it is the right one.
     */
    query.value = ''
    lastCommit.value = null
    lastCommittedValue = undefined
  })

  /** A Query that no longer describes the model. See CONTEXT.md — Dirty Query. */
  const isDirty = computed(() => !hasValue.value && query.value.trim().length > 0)

  /** Nothing has arrived yet, so the popup shows a spinner rather than an empty list. */
  const isLoadingFirstPage = computed(() =>
    !!toValue(options.loading) && allOptions.value.length === 0)

  /**
   * Whether the popup is currently rendering the listbox. The popup branches on it and the
   * input's `aria-controls` / `aria-activedescendant` hang off it, so it lives here rather
   * than being recomputed in both — an `aria-controls` pointing at an id that resolves to
   * nothing is worse than no relationship at all.
   */
  const listboxIsRendered = computed(() =>
    options.isOpen.value && !isLoadingFirstPage.value)

  // ---------------------------------------------------------------- navigation

  /**
   * Highlights the first enabled Visible Option whose Label *starts with* the Query, and
   * nothing otherwise.
   *
   * Prefix rather than "whatever is first": the default filter matches substrings, so the top
   * row may merely contain the Query. Committing that on `Enter` is the Freeform trap — the
   * user types a custom value in full and gets a suggestion they were ignoring. Falling back
   * to no Active Option makes `Enter` mean "use my text", which is the safe reading.
   */
  function syncAutoHighlight() {
    if (!(toValue(options.autoHighlight) ?? !toValue(options.freeform))) {
      activeKey.value = null
      return
    }
    const q = query.value.trim().toLowerCase()
    const first = visibleOptions.value.find(o => !o.disabled)
    if (!q || !first || !first.label.toLowerCase().startsWith(q)) {
      activeKey.value = null
      return
    }
    activeKey.value = first.key
  }

  // -------------------------------------------------------------- open / close

  /**
   * Positions the Active Option for a freshly-opened popup. `selected-or-none` is what a mouse
   * open uses: browsing is not navigating, so with nothing selected it leaves `Enter` meaning
   * "use my text" rather than committing whichever Option happens to be first.
   */
  function positionOnOpen(position: Exclude<OpenPosition, 'none'>) {
    const selected = visibleOptions.value.findIndex(isSelected)
    if (selected !== -1) return navigate(selected)
    if (position === 'selected-or-none') {
      activeKey.value = null
      return
    }
    navigate(position === 'selected-or-first' ? nav.firstEnabled() : nav.lastEnabled())
  }

  /**
   * Set by `open()` so the `isOpen` watcher can tell an open it drove from one it did not —
   * `Dropdown` and the consumer can both write `isOpen` directly.
   */
  let openWasHandled = false

  /** Returns whether the popup actually opened; callers must not act on a refused open. */
  function open(position: OpenPosition = 'selected-or-none'): boolean {
    if (toValue(options.disabled)) return false
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
      // The Query deliberately survives: it is the input's visible text, not a filter.
      activeKey.value = null
      openWasHandled = false
      return
    }
    if (!openWasHandled) positionOnOpen('selected-or-none')
  })

  /**
   * Re-seats the Active Option when the list changes underneath it — a re-narrowing that
   * filtered it out, or `items` arriving from a server after the keystroke that asked for it.
   * `syncAutoHighlight` also clears a stale Key when it declines to highlight.
   */
  watch(visibleOptions, () => {
    if (!options.isOpen.value) return
    if (activeIndex.value !== -1) return
    syncAutoHighlight()
  })

  /** Commits an Option: the one path that makes the Query an echo rather than a search. */
  function commit(option: AutocompleteOption<T>) {
    if (option.disabled) return
    writeValue(option.value)
    query.value = option.label
    lastCommit.value = option
    close()
  }

  /** Empties both models. Discards the Last Commit, or the next Abandon would resurrect it. */
  function clear() {
    writeValue(null)
    query.value = ''
    lastCommit.value = null
    lastCommittedValue = undefined
    activeKey.value = null
  }

  /**
   * See CONTEXT.md — Abandon. Runs on blur, on `Tab`, and on the second `Escape`.
   *
   * The empty-Query branch is what makes the field clearable by keyboard at all: select-all
   * then `Delete` leaves an empty Query, and restoring the Last Commit over it would mean the
   * field had no "off". A partial Query is ambiguous — a slip, or an abandoned edit — so the
   * conservative reading wins there instead.
   */
  function abandon() {
    if (hasValue.value) return
    if (!query.value.trim()) {
      lastCommit.value = null
      lastCommittedValue = undefined
      return
    }
    if (toValue(options.freeform)) return
    const option = lastCommit.value
    if (option) {
      writeValue(option.value)
      query.value = option.label
      return
    }
    // No Option ever resolved, but a Value was still set — restore it unlabelled rather than
    // destroy it. See `lastCommittedValue`.
    if (!isNullish(lastCommittedValue)) {
      writeValue(lastCommittedValue)
    }
    query.value = ''
  }

  // ------------------------------------------------------------------ keyboard

  /**
   * The user edited the Query. This is the single place the Query changes by typing, so the
   * (A) invariant is enforced here rather than in a watcher — a watcher would also fire on the
   * echo that `commit` and `abandon` write, and fight the restore they perform in the same tick.
   */
  function handleInput(value: string) {
    query.value = value
    // (A): the text no longer describes the Value, so there is no Value. See ADR-0012.
    if (hasValue.value) writeValue(null)
    if (!options.isOpen.value) open('none')
    syncAutoHighlight()
  }

  /** Returns whether anything was committed, so `Enter` knows whether to consume the key. */
  function selectActive() {
    const option = activeOption.value
    if (!option || option.disabled) return false
    commit(option)
    return true
  }

  function handleClosedKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        open(event.altKey ? 'none' : 'selected-or-first')
        return
      case 'ArrowUp':
        event.preventDefault()
        open('selected-or-last')
        return
      case 'Escape':
        // Stage two. Consumed only when there is an edit to undo, so an enclosing dialog
        // still sees the key in every other case.
        if (!isDirty.value) return
        event.preventDefault()
        event.stopPropagation()
        abandon()
    }
    // Printable keys, `Home`/`End`, `Delete`/`Backspace` and `Enter` all belong to the input.
    // Typing reaches `handleInput` through the native `input` event, which is what opens the
    // popup — so unlike Select there is no keystroke to seed.
  }

  function handleOpenKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
        // Caught before the movement keys, which would read the arrow as a move.
        if (event.altKey) {
          event.preventDefault()
          close()
          return
        }
        break
      case 'Enter':
        // With no Active Option the key passes through, so a form still submits and a Freeform
        // Query still stands as the value. See ADR-0012.
        if (!selectActive()) return
        event.preventDefault()
        return
      case 'Escape':
        /**
         * Stage one: dismiss the popup, leave the text alone. Stopped here because `Dropdown`
         * would otherwise close it with `stopImmediatePropagation`, and stage two could then
         * never be told apart from stage one.
         */
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      case 'Tab':
        // "Focus moved" and "value changed" are never the same gesture: no commit. The blur
        // that follows runs `abandon`.
        close()
        return
    }
    // Movement only. `Home` and `End` are caret keys in an editable combobox, so they are not
    // forwarded — `PageUp`/`PageDown` are the only keys that jump the list. See ADR-0012.
    if (NAVIGATION_KEYS.has(event.key)) nav.handleKeydown(event)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (toValue(options.disabled)) return
    if (options.isOpen.value) return handleOpenKeydown(event)
    handleClosedKeydown(event)
  }

  return {
    query,
    allOptions,
    groups,
    visibleOptions,
    activeKey,
    activeDescendantId,
    activeOption,
    hasValue,
    isDirty,
    isLoadingFirstPage,
    listboxIsRendered,
    lastCommit,
    selectedOption,
    isSelected,
    keyOfValue,
    open,
    close,
    commit,
    clear,
    abandon,
    setActiveIndex,
    handleInput,
    handleKeydown,
  }
}

export type UseAutocompleteReturn<T> = ReturnType<typeof useAutocomplete<T>>
