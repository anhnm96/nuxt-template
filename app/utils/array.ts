// check if all elements of a subset array are present in a superset array
export function isSubset(subset: string[], superset: string[]): boolean {
  return subset.every((element: string) => superset.includes(element))
}

export function mod(index: number, total: number): number {
  return ((index % total) + total) % total
}

/**
 * Moves an item, shifting everything in between. In place, so the array
 * identity stays the same and a transition-group can animate the move.
 * Returns nothing when the move is a no-op or out of bounds.
 */
export function moveItem<T>(arr: T[], from: number, to: number) {
  if (from === to) return
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return
  arr.splice(to, 0, ...arr.splice(from, 1))
  return arr
}
