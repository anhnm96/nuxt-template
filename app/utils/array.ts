// check if all elements of a subset array are present in a superset array
export function isSubset(subset: string[], superset: string[]): boolean {
  return subset.every((element: string) => superset.includes(element))
}

export function mod(index: number, total: number): number {
  return ((index % total) + total) % total
}
