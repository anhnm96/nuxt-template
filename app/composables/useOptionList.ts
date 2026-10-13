import type { MaybeRefOrGetter } from 'vue'

/**
 * The option-list model shared by `Select` and `Autocomplete`: Items normalised into Options,
 * narrowed by a Query, clustered into Groups, and navigated as Visible Options. Terms in Title
 * Case are defined in CONTEXT.md.
 *
 * It owns the *model* and nothing else. Who owns the Query, when the popup opens, what a key
 * means and what selecting does all stay with the host — which is why `query` and `skipFilter`
 * are inputs here rather than policy. That cut is the one ADR-0009 already made one layer down,
 * where `useListNavigation` owns the movement arithmetic and each host keeps its own cursor.
 * See ADR-0012.
 */

/** How an Item's Label / Value / Key / disabled state is read. Mirrors `useCheckbox`'s `valueAdapter`. */
export type OptionAccessor<T, R> = keyof T | ((item: T) => R)

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
 * Key accessors (`item-value="gameId"`) infer through this in every mode. The accessors that
 * are *type parameters* — `itemChildren`, `itemValue` — need a function form typed explicitly
 * (`(g: Game) => g.gameId`), because an implicit `g` has no contextual type at an inference
 * site: the parameter reports TS7006, and the type parameter falls back to its `undefined`
 * default, so the prop reports TS2322 too. That limitation predates nesting and applies to
 * the flat form too. Every other accessor is typed over an already-resolved parameter and
 * takes a bare arrow.
 *
 * Guarded at real call sites by `playground/select-types.vue` and
 * `playground/autocomplete-types.vue`.
 */
export type OptionTypeOf<I, CK> = [CK] extends [undefined] ? I : ChildrenOf<I, CK>

/**
 * The Value a model carries, derived from how `itemValue` was specified.
 * Omitting `itemValue` means the whole Item is the Value.
 */
export type OptionValueOf<T, VK>
  = VK extends keyof T ? T[VK]
    : VK extends (item: T) => infer R ? R
      : T

/** The normalised view of an Item. See CONTEXT.md — Option. */
export interface ListOption<T> {
  item: T
  /** Primitive, stable identity. Never compared against Value. */
  key: Key
  /** What the model emits. May be the whole Item. */
  value: any
  label: string
  disabled: boolean
  /** `${id}-opt-${index}`, for `aria-activedescendant`. See `toOptionId`. */
  id: string
  /** Display label of the Group this Option belongs to. Empty string means ungrouped. */
  group: string
}

/** A run of Options sharing a Group label. Rendering only — navigation stays flat. */
export interface ListGroup<T> {
  label: string
  /** `${id}-grp-N`, referenced by the group's `aria-labelledby`. */
  id: string
  options: ListOption<T>[]
}

export interface UseOptionListOptions<T> {
  /** Raw `items`: Options when flat, Groups when `itemChildren` is set. */
  items: MaybeRefOrGetter<any[]>
  /** Reads a Group's Options. Its presence is what puts the list in nested mode. */
  itemChildren?: OptionAccessor<any, T[]>
  itemLabel?: OptionAccessor<T, string>
  itemValue?: OptionAccessor<T, any>
  itemKey?: OptionAccessor<T, Key>
  itemDisabled?: OptionAccessor<T, boolean>
  /**
   * The Group label, read from an element of `items` — the Option itself when flat, the
   * Group object when nested. Omit for an ungrouped list.
   */
  itemGroup?: OptionAccessor<any, string>
  /** Base id for the control; Option ids derive from it. */
  id: MaybeRefOrGetter<string>
  /**
   * The text Options are matched against. Owned by the host: a Select resets it when the
   * popup closes, an Autocomplete models it and keeps it. See CONTEXT.md — Search Query, Query.
   */
  query?: MaybeRefOrGetter<string>
  /** How a Label is matched. Defaults to a case-insensitive substring match. */
  filterFn?: MaybeRefOrGetter<((item: T, query: string) => boolean) | undefined>
  /**
   * Render every Option untouched, whatever the Query holds. Both hosts pass `externalFilter`
   * through it; an Autocomplete also passes "the Query is an echo of the selected Label, not a
   * search", which is what keeps a filled field browsable.
   */
  skipFilter?: MaybeRefOrGetter<boolean | undefined>
  /** The currently selected Values — zero or one for a single-select, many for a multiple. */
  selectedValues: MaybeRefOrGetter<unknown[]>
  /** Arrow keys come round at the ends. A listbox clamps. @defaultValue false */
  loop?: MaybeRefOrGetter<boolean | undefined>
  /** Printable characters jump the cursor. Off wherever a text field owns them. */
  typeahead?: MaybeRefOrGetter<boolean | undefined>
  /** Names the host in dev warnings, e.g. `'Select'`. */
  componentName: string
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
function toOptionId(id: string, index: number) {
  return `${id}-opt-${index}`
}

export function useOptionList<T>(options: UseOptionListOptions<T>) {
  /**
   * The Active Option is tracked by Key, not index — filtering reorders indices
   * but a Key keeps pointing at the same Option.
   */
  const activeKey = ref<Key | null>(null)

  function read<R>(item: T, accessor: OptionAccessor<T, R> | undefined, fallback: R): R {
    if (accessor === undefined) return fallback
    if (typeof accessor === 'function') return accessor(item)
    return item[accessor] as unknown as R
  }

  /** `read` is typed for Options; Groups are a different shape, so they get their own. */
  function readRaw<R>(raw: any, accessor: OptionAccessor<any, R> | undefined, fallback: R): R {
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
    // `itemKey` defaults to `itemValue`, so in the common primitive case Key === Value
    // and a Value resolves to a Key without `items` being loaded at all.
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

  function toOption(item: T, group: string, index: number, id: string): ListOption<T> {
    const key = getKey(item)
    if (import.meta.dev && key !== null && typeof key === 'object') {
      warnOnce(
        `[${options.componentName}] \`itemKey\` is required when \`itemValue\` is omitted: `
        + 'without it the whole Item becomes the Key, so Options cannot be matched by identity '
        + 'and a Value restored from JSON will not resolve.',
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
   * Flattens the two accepted input shapes into one list of Options.
   *
   * Nested input is expanded here rather than at the call site so that everything downstream
   * — filtering, grouping, keyboard navigation — keeps seeing a single flat array. A Group's
   * own position is preserved, and `groups` below re-clusters by label, so nested input and
   * pre-clustered flat input produce identical output.
   */
  const allOptions = computed<ListOption<T>[]>(() => {
    const raw = toValue(options.items)
    const children = options.itemChildren
    // Read once rather than per Option: `id` is a computed in the component above.
    const listId = toValue(options.id)
    hasWarned = false
    if (children === undefined) {
      return raw.map((item, index) => toOption(item as T, readGroupLabel(item), index, listId))
    }
    // One counter across all Groups, so ids stay unique once the Groups are flattened.
    let index = 0
    return raw.flatMap((group) => {
      const label = readGroupLabel(group)
      const items = readRaw<T[]>(group, children, []) ?? []
      return items.map(item => toOption(item, label, index++, listId))
    })
  })

  const matchedOptions = computed(() => {
    const q = (toValue(options.query) ?? '').trim()
    if (!q || toValue(options.skipFilter)) return allOptions.value
    const fn = toValue(options.filterFn)
    if (fn) return allOptions.value.filter(o => fn(o.item, q))
    // Default: case-insensitive substring over the Label, folded once rather than per Option.
    const needle = q.toLowerCase()
    return allOptions.value.filter(o => o.label.toLowerCase().includes(needle))
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
  const groups = computed<ListGroup<T>[]>(() => {
    const byLabel = new Map<string, ListGroup<T>>()
    const ordered: ListGroup<T>[] = []
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

  function isSelected(option: ListOption<T>) {
    return selectedKeys.value.has(option.key)
  }

  // ---------------------------------------------------------------- navigation

  /** Pure state change. Pointer hover uses this: see `navigate` for why it must not scroll. */
  function setActiveIndex(index: number) {
    const option = visibleOptions.value[index]
    activeKey.value = option ? option.key : null
  }

  /**
   * Nothing is focused inside the list, so the browser will not reveal the Active Option for us.
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

  /**
   * The movement arithmetic — stepping, the edges, the page keys, seeking past disabled
   * Options and Typeahead — is shared with `Menu`. ADR-0009 explains why only the algorithm
   * is shared and not the data: the cursor stays here, because `activeKey` is a listbox's
   * (ADR-0001) and "move" for these widgets means `navigate`, which never takes DOM focus.
   *
   * A `ListOption` already carries `disabled` and `label`, so `entries` needs no mapping.
   */
  const nav = useListNavigation({
    entries: () => visibleOptions.value,
    index: () => activeIndex.value,
    onMove: navigate,
    loop: () => toValue(options.loop) ?? false,
    typeahead: () => toValue(options.typeahead) ?? false,
  })

  return {
    allOptions,
    matchedOptions,
    groups,
    visibleOptions,
    activeKey,
    activeIndex,
    activeOption,
    activeDescendantId,
    keyOfValue,
    selectedKeys,
    isSelected,
    setActiveIndex,
    scrollActiveIntoView,
    navigate,
    nav,
  }
}

export type UseOptionListReturn<T> = ReturnType<typeof useOptionList<T>>
