# useListNavigation

The movement half of a vertical list keymap: arrow keys, `Home` and `End`, the page keys and Typeahead, over rows that can be disabled.

It owns the arithmetic and nothing else. It holds no cursor of its own. The host reads and writes the cursor through `index` and `onMove`, so a host that moves real DOM focus and a host that tracks a key for `aria-activedescendant` share one implementation. Activation, dismissal and selection stay with the host. [ADR-0009](/docs/reference/adr/0009-menus-are-menus-not-listboxes) explains why only the algorithm is shared.

Used by [Menu](/docs/components/menu) directly, and by [Select](/docs/components/select) and [Autocomplete](/docs/components/autocomplete) through [useOptionList](/docs/composables/use-option-list).

## Usage

```vue
<script setup lang="ts">
const rows = [
  { label: 'Alpha', disabled: false },
  { label: 'Bravo', disabled: true },
  { label: 'Charlie', disabled: false },
]
const active = ref(-1)
const committed = ref('')
const nav = useListNavigation({
  entries: () => rows,
  index: () => active.value,
  onMove: index => (active.value = index),
  loop: true,
})

function onKeydown(event: KeyboardEvent) {
  if (nav.handleKeydown(event) || event.key !== 'Enter') return
  const row = rows[active.value]
  if (row && !row.disabled) committed.value = row.label
}
</script>

<template>
  <ul tabindex="0" aria-label="Navigation demo" @keydown="onKeydown">
    <li v-for="(row, index) in rows" :key="row.label">
      {{ row.label }}{{ row.disabled ? ' (disabled)' : '' }}
      <strong v-if="index === active"> (active)</strong>
    </li>
  </ul>
  <p role="status">Committed: {{ committed || 'None' }}</p>
</template>
```

Focus the list and press an arrow key to move the active row. The composable skips Bravo.
Press Enter to commit the active row. The host handles Enter and decides what to do with it.

## Signature

```ts
interface NavigableEntry {
  disabled: boolean // skipped by movement and by Typeahead
  label: string // matched by Typeahead, case-insensitively
}

function useListNavigation(options: UseListNavigationOptions): {
  move: (delta: number, wrap: boolean) => void
  moveToStart: () => void
  moveToEnd: () => void
  firstEnabled: () => number
  lastEnabled: () => number
  typeahead: (char: string) => void
  resetTypeahead: () => void
  handleKeydown: (event: KeyboardEvent) => boolean
}
```

### Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `entries` | `() => NavigableEntry[]` | required | The current rows. Read fresh on every move, so a list that changes between keystrokes never moves against a stale copy. |
| `index` | `() => number` | required | Where the cursor is now, as an index into `entries()`. `-1` means nowhere. |
| `onMove` | `(index: number) => void` | required | Moves the cursor. The host decides what "here" means. |
| `loop` | `MaybeRefOrGetter<boolean \| undefined>` | `false` | Arrow keys come round at the ends. A menu loops; a listbox clamps. |
| `typeahead` | `MaybeRefOrGetter<boolean \| undefined>` | `true` | Printable characters move the cursor to the next matching Label. |

## Behaviour

- **Arrows** step by one. With `loop` off they stop at the ends.
- **`Home`, `End`, `PageUp` and `PageDown`** always clamp, because they name an absolute place rather than a step. The page keys move by a flat 10 rows, not a measured viewport.
- **From nowhere** (`index() === -1`) a downward step enters at the top and an upward step enters at the bottom.
- **Disabled rows** are skipped. Without wrapping, a move that lands on a run of disabled rows at the end of the list settles on the last enabled row instead of giving up. `-1` comes back only when every row is disabled.
- **Typeahead** matches the start of a Label, case-insensitively, scanning from the row after the cursor and wrapping once. The buffer clears after 500 ms without a keystroke, and at once when nothing matches.
- **A repeated letter** walks the rows that start with it, but only after the buffer as typed has matched nothing. A list that holds `Aardvark` answers a second `a` with that row. This follows the order of the APG select-only combobox.

## Notes

- `Space` never reaches Typeahead, because it activates the row under the cursor in every host. A space inside a buffer is lost, which costs the second word of a two-word Label.
- Typeahead ignores keys held with `Ctrl`, `Meta` or `Alt`.
- `firstEnabled` and `lastEnabled` return positions without moving the cursor. Use them to place a popup on open, or to re-seat a cursor the list no longer holds. They return `-1` for an all-disabled list, and a host can act on that.
- The Typeahead timer is cleared when the owning scope is disposed.
