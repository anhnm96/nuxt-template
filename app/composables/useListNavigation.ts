import type { MaybeRefOrGetter } from 'vue'

/**
 * One navigable row, as the host sees it. The host decides where these come from: `Menu`
 * reads them from the DOM, a list widget may map them from an array.
 */
export interface NavigableEntry {
  /** Skipped by movement and by Typeahead. */
  disabled: boolean
  /** Matched by Typeahead, case-insensitively. */
  label: string
}

export interface UseListNavigationOptions {
  /**
   * The current rows, read fresh on every move. A host whose list changes between
   * keystrokes therefore never moves against a stale copy.
   */
  entries: () => NavigableEntry[]
  /** Where the cursor is now, as an index into `entries()`. `-1` means nowhere. */
  index: () => number
  /** Moves the cursor. The host projects this however it expresses "here". */
  onMove: (index: number) => void
  /**
   * Arrow keys come round at the ends. A menu loops, a listbox clamps; `Home`, `End` and
   * the page keys clamp either way, because they name an absolute place rather than a step.
   * @defaultValue false
   */
  loop?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Printable characters move the cursor to the next matching Label.
   * @defaultValue true
   */
  typeahead?: MaybeRefOrGetter<boolean | undefined>
}

/** How long a Typeahead buffer survives without a keystroke. */
const TYPEAHEAD_RESET_MS = 500
/** `PageUp`/`PageDown` move by a flat count — deterministic, unlike a measured viewport page. */
const PAGE_SIZE = 10

/**
 * Space never reaches Typeahead: it activates the row under the cursor in every widget that
 * uses this, and a Typeahead buffer cannot usefully start with one. A space *inside* a
 * buffer is lost with it, which costs the second word of a two-word Label.
 */
function isTypeaheadKey(event: KeyboardEvent) {
  return event.key.length === 1 && event.key !== ' '
    && !event.ctrlKey && !event.metaKey && !event.altKey
}

/**
 * The movement half of a vertical list keymap: arrows, `Home`/`End`, the page keys and
 * Typeahead, over rows that may be disabled.
 *
 * It owns the arithmetic and nothing else. It holds no cursor of its own — the host reads
 * and writes that through `index` and `onMove` — so a host roving real DOM focus and a host
 * tracking a key for `aria-activedescendant` can share one implementation. Activation,
 * dismissal and selection all stay with the host; see ADR-0009.
 */
export function useListNavigation(options: UseListNavigationOptions) {
  const loops = () => toValue(options.loop) ?? false

  /**
   * Scans from `start` for an enabled row.
   *
   * Without wrapping it scans outwards in both directions, so a move that lands on a run of
   * disabled rows at the end of the list settles on the last enabled one rather than giving
   * up. Returns `-1` only when every row is disabled.
   *
   * Takes the list rather than reading it: its one caller has read it already, and in a host
   * that reads the DOM — `Menu` does — each read is a fresh query.
   */
  function seekEnabled(list: NavigableEntry[], start: number, direction: 1 | -1, wrap: boolean): number {
    const count = list.length
    if (count === 0) return -1

    if (wrap) {
      for (let step = 0; step < count; step++) {
        const index = mod(start + step * direction, count)
        if (!list[index]!.disabled) return index
      }
      return -1
    }

    for (let index = start; index >= 0 && index < count; index += direction) {
      if (!list[index]!.disabled) return index
    }
    for (let index = start - direction; index >= 0 && index < count; index -= direction) {
      if (!list[index]!.disabled) return index
    }
    return -1
  }

  /** Both give `-1` when every row is disabled, which is what every caller here tests for. */
  const firstEnabled = () => options.entries().findIndex(entry => !entry.disabled)
  const lastEnabled = () => options.entries().findLastIndex(entry => !entry.disabled)

  function move(delta: number, wrap: boolean) {
    const list = options.entries()
    const count = list.length
    if (count === 0) return
    const direction = delta > 0 ? 1 : -1
    const from = options.index()
    // Nowhere yet: a downward step enters at the top, an upward one at the bottom.
    if (from === -1) return direction === 1 ? moveToStart() : moveToEnd()

    const target = wrap ? mod(from + delta, count) : clamp(from + delta, 0, count - 1)
    const found = seekEnabled(list, target, direction, wrap)
    if (found !== -1) options.onMove(found)
  }

  function moveToStart() {
    const found = firstEnabled()
    if (found !== -1) options.onMove(found)
  }

  function moveToEnd() {
    const found = lastEnabled()
    if (found !== -1) options.onMove(found)
  }

  // ----------------------------------------------------------------- typeahead

  let typeaheadBuffer = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

  function resetTypeahead() {
    clearTimeout(typeaheadTimer)
    typeaheadBuffer = ''
  }

  /**
   * The first enabled row whose Label starts with `query`, scanning from `start` and
   * wrapping once. `-1` when none matches.
   */
  function seekMatch(list: NavigableEntry[], start: number, query: string): number {
    for (let step = 0; step < list.length; step++) {
      const index = (start + step) % list.length
      const entry = list[index]!
      if (!entry.disabled && entry.label.toLowerCase().startsWith(query)) return index
    }
    return -1
  }

  /**
   * Moves the cursor to the next matching Label. Always wraps — it is a jump, not a step.
   *
   * Follows the order APG's own select-only combobox uses: the buffer as typed first, then
   * the repeated-letter cycle, then give up and drop the buffer. See DESIGN.md — "Typeahead
   * follows APG's order".
   */
  function typeahead(char: string) {
    clearTimeout(typeaheadTimer)
    typeaheadBuffer += char.toLowerCase()
    typeaheadTimer = setTimeout(resetTypeahead, TYPEAHEAD_RESET_MS)

    const list = options.entries()
    if (!list.length) return

    // From the row *after* the cursor, so a repeat lands on the next match rather than
    // the one already under it. This holds for a longer buffer too, which is what makes
    // `c` then `h` step past a Charlie already under the cursor onto Chess.
    const start = options.index() + 1

    const matched = seekMatch(list, start, typeaheadBuffer)
    if (matched !== -1) return options.onMove(matched)

    /**
     * One character typed over and over means "the next row starting with it", once the
     * buffer as typed has matched nothing. Repeating a letter is how a user walks
     * same-letter rows, and APG requires it. The order matters: a list holding `Aardvark`
     * must answer a second `a` with that row, not treat the `aa` as a cycle.
     */
    const isRepeatedChar = typeaheadBuffer.length > 1
      && [...typeaheadBuffer].every(c => c === typeaheadBuffer[0])
    if (isRepeatedChar) {
      const cycled = seekMatch(list, start, typeaheadBuffer[0]!)
      if (cycled !== -1) return options.onMove(cycled)
    }

    // Nothing matches, so the buffer is a dead end. Dropping it now lets the next keystroke
    // start a fresh search, rather than making the user wait out the reset after a typo.
    resetTypeahead()
  }

  onScopeDispose(resetTypeahead, true)

  // ------------------------------------------------------------------ keyboard

  /**
   * Handles the movement keys only, and returns whether it consumed the event. A key it
   * consumed is already `preventDefault`ed; anything else is the host's to deal with —
   * notably `Enter`, `Space`, `Escape` and `Tab`, which commit or dismiss rather than move.
   */
  function handleKeydown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowDown':
        move(1, loops())
        break
      case 'ArrowUp':
        move(-1, loops())
        break
      case 'Home':
        moveToStart()
        break
      case 'End':
        moveToEnd()
        break
      case 'PageDown':
        move(PAGE_SIZE, false)
        break
      case 'PageUp':
        move(-PAGE_SIZE, false)
        break
      default:
        if (!(toValue(options.typeahead) ?? true) || !isTypeaheadKey(event)) return false
        typeahead(event.key)
    }
    event.preventDefault()
    return true
  }

  return {
    move,
    moveToStart,
    moveToEnd,
    /**
     * The edges as *positions*, for a host that needs one without moving the cursor there —
     * positioning a popup on open, or re-seating a cursor the list no longer holds. They
     * return `-1` for an all-disabled list, which a host may want to act on rather than
     * ignore: `Select` passes it straight through to clear its Active Option.
     */
    firstEnabled,
    lastEnabled,
    typeahead,
    resetTypeahead,
    handleKeydown,
  }
}
