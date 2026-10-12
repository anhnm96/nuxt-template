import type { MaybeRefOrGetter, Ref } from 'vue'

/**
 * Normalization, filtering, grouping and navigation here are a deliberate copy of
 * `useSelect`'s. They are to be lifted into a shared `useOptionList`; see ADR-0012 —
 * "The duplication is deliberate and time-boxed". Keep the two shapes parallel, so that
 * extraction stays a lift rather than a merge.
 */

/** How an Item's Label / Value / Key / disabled state is read. */
export type AutocompleteAccessor<T, R> = keyof T | ((item: T) => R)

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
 * The accessors that are *type parameters* — `itemChildren`, `itemValue` — need a function
 * form typed explicitly (`(g: Game) => g.gameId`): an implicit parameter has no contextual
 * type at an inference site, so it reports TS7006 and the type parameter falls back to its
 * `undefined` default. `playground/autocomplete-types.vue` guards the inference.
 */
export type AutocompleteOptionType<I, CK> = [CK] extends [undefined] ? I : ChildrenOf<I, CK>

/**
 * The Value `v-model` carries, derived from how `itemValue` was specified.
 * Omitting `itemValue` means the whole Item is the Value.
 */
export type AutocompleteValue<T, VK>
  = VK extends keyof T ? T[VK]
    : VK extends (item: T) => infer R ? R
      : T

/**
 * What `v-model` carries. Always nullable and never an array: `freeform` does not narrow it,
 * because the Query is a model of its own. See ADR-0012 — "Two models, not one".
 */
export type AutocompleteModel<T, VK> = MaybeNull<AutocompleteValue<T, VK>>

/** The normalised view of an Item. See CONTEXT.md — Option. */
export interface AutocompleteOption<T> {
  item: T
  /** Primitive, stable identity. Never compared against Value. */
  key: Key
  /** What `v-model` emits. May be the whole Item. */
  value: any
  label: string
  disabled: boolean
  /** `${id}-opt-${index}`, for `aria-activedescendant`. See `toOptionId`. */
  id: string
  /** Display label of the Group this Option belongs to. Empty string means ungrouped. */
  group: string
}

/** A run of Options sharing a Group label. Rendering only — navigation stays flat. */
export interface AutocompleteGroup<T> {
  label: string
  /** `${id}-grp-N`, referenced by the group's `aria-labelledby`. */
  id: string
  options: AutocompleteOption<T>[]
}

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
  /** Below this many characters the popup offers no Options at all. */
  minQueryLength?: MaybeRefOrGetter<number | undefined>
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

/**
 * Option ids are derived from the Option's *position*, not its Key.
 *
 * Keys are consumer-supplied and arbitrary: sanitising one into a DOM id can collide
 * (`'a b'` and `'a_b'` both become `a_b`), and in whole-Item mode with `itemKey` omitted
 * every Key stringifies to `[object Object]`, giving every Option the same id. Duplicate
 * ids break `aria-activedescendant` and `getElementById`-based scrolling silently.
 */
function toOptionId(id: string, index: number) {
  return `${id}-opt-${index}`
}

/** The movement keys this widget forwards. `Home`/`End` are caret keys — see ADR-0012. */
const NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])

export function useAutocomplete<T>(options: UseAutocompleteOptions<T>) {
  const query = options.query
  /**
   * The Active Option is tracked by Key, not index — filtering reorders indices
   * but a Key keeps pointing at the same Option.
   */
  const activeKey = ref<Key | null>(null)

  function read<R>(item: T, accessor: AutocompleteAccessor<T, R> | undefined, fallback: R): R {
    if (accessor === undefined) return fallback
    if (typeof accessor === 'function') return accessor(item)
    return item[accessor] as unknown as R
  }

  /** `read` is typed for Options; Groups are a different shape, so they get their own. */
  function readRaw<R>(raw: any, accessor: AutocompleteAccessor<any, R> | undefined, fallback: R): R {
    if (accessor === undefined) return fallback
    if (typeof accessor === 'function') return accessor(raw)
    return raw[accessor]
  }

  function getLabel(item: T) {
    return String(read<any>(item, options.itemLabel, item))
  }

  function getValue(item: T) {
    // Omitting `itemValue` makes the whole Item the Value, which is what the fallback is.
    return read<any>(item, options.itemValue, item)
  }

  function getKey(item: T): Key {
    // `itemKey` defaults to `itemValue`, so in the common primitive case Key === Value.
    const accessor = options.itemKey ?? options.itemValue
    return read<any>(item, accessor, item)
  }

  /**
   * A misconfigured accessor is true of every Item, so one warning says what fifty would.
   * Reset per rebuild, so the warning returns if `items` is swapped and still wrong.
   */
  let hasWarned = false
  function warnOnce(...args: unknown[]) {
    if (hasWarned) return
    hasWarned = true
    console.warn(...args)
  }

  function toOption(item: T, group: string, index: number, id: string): AutocompleteOption<T> {
    const key = getKey(item)
    if (import.meta.dev && key !== null && typeof key === 'object') {
      warnOnce(
        '[Autocomplete] `itemKey` is required when `itemValue` is omitted: without it the '
        + 'whole Item becomes the Key, so Options cannot be matched by identity and a Value '
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
      id: toOptionId(id, index),
    }
  }

  function readGroupLabel(raw: any) {
    if (options.itemGroup === undefined) return ''
    return String(readRaw<any>(raw, options.itemGroup, '') ?? '')
  }

  /**
   * Flattens the two accepted input shapes into one list of Options. Nested input is expanded
   * here so that everything downstream keeps seeing a single flat array.
   */
  const allOptions = computed<AutocompleteOption<T>[]>(() => {
    const raw = toValue(options.items)
    const children = options.itemChildren
    const id = toValue(options.id)
    hasWarned = false
    if (children === undefined) {
      return raw.map((item, index) => toOption(item as T, readGroupLabel(item), index, id))
    }
    // One counter across all Groups, so ids stay unique once the Groups are flattened.
    let index = 0
    return raw.flatMap((group) => {
      const label = readGroupLabel(group)
      const items = readRaw<T[]>(group, children, []) ?? []
      return items.map(item => toOption(item, label, index++, id))
    })
  })

  /** Whether the model currently holds anything. Drives both filtering and Abandon. */
  const hasValue = computed(() => !isNullish(toValue(options.selectedValue)))

  const minQueryLength = computed(() => toValue(options.minQueryLength) ?? 0)
  const isBelowMinQueryLength = computed(() =>
    query.value.trim().length < minQueryLength.value)

  const matchedOptions = computed(() => {
    // Nothing is offered below the threshold, so there is nothing to navigate either. The
    // popup shows the "keep typing" state instead of an empty list.
    if (isBelowMinQueryLength.value) return []
    const q = query.value.trim()
    /**
     * A Value means the Query is an *echo* of its Label, not a search — the (A) invariant in
     * ADR-0012 guarantees the two are equal. Filtering by it would narrow a filled field to
     * the one Option already chosen, and the chevron would browse nothing.
     */
    if (!q || hasValue.value || toValue(options.externalFilter)) return allOptions.value
    const fn = toValue(options.filterFn)
    if (fn) return allOptions.value.filter(o => fn(o.item, q))
    // Default: case-insensitive substring over the Label, folded once rather than per Option.
    const needle = q.toLowerCase()
    return allOptions.value.filter(o => o.label.toLowerCase().includes(needle))
  })

  /**
   * Groups in **first-appearance order**: a Group takes the position of its first member, and
   * Options keep their relative order within it. A Group whose Options are all filtered out
   * disappears entirely, because it is built from the matched Options.
   */
  const groups = computed<AutocompleteGroup<T>[]>(() => {
    const byLabel = new Map<string, AutocompleteGroup<T>>()
    const ordered: AutocompleteGroup<T>[] = []
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

  /** Visible Options — what every keyboard behaviour navigates. Never `items`. */
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

  const selectedKey = computed(() => keyOfValue(toValue(options.selectedValue)))

  function isSelected(option: AutocompleteOption<T>) {
    return selectedKey.value !== null && option.key === selectedKey.value
  }

  /** The Option behind the current Value, once `items` can resolve it. */
  const selectedOption = computed(() => allOptions.value.find(isSelected) ?? null)

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
    options.isOpen.value && !isBelowMinQueryLength.value && !isLoadingFirstPage.value)

  // ---------------------------------------------------------------- navigation

  /** Pure state change. Pointer hover uses this: see `navigate` for why it must not scroll. */
  function setActiveIndex(index: number) {
    const option = visibleOptions.value[index]
    activeKey.value = option ? option.key : null
  }

  /**
   * Nothing is focused inside the list, so the browser will not reveal the Active Option.
   *
   * Only keyboard navigation scrolls. If hovering scrolled too, `block: 'nearest'` would shift
   * the list to reveal a partly-visible row, the next `mousemove` would land on a different
   * option, and the highlight would run ahead of the cursor — making clicks select the wrong row.
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

  const nav = useListNavigation({
    entries: () => visibleOptions.value,
    index: () => activeIndex.value,
    onMove: navigate,
    // Arrows clamp here where a Menu wraps, matching Select.
    loop: false,
    // The input owns every printable key, so there is no Typeahead. See CONTEXT.md — Query.
    typeahead: () => false,
  })

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

  // ----------------------------------------------------------------- the model

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
    isBelowMinQueryLength,
    isLoadingFirstPage,
    listboxIsRendered,
    minQueryLength,
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
