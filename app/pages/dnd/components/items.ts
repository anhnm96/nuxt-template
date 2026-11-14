export interface Item {
  id: number
  text: string
}

// One counter for the page. The lists of the group "infinite" exchange items, and each
// list keys its rows by `id`, so two lists must not make the same id.
let nextId = 0

export function createItems(count: number, label: string): Item[] {
  return Array.from({ length: count }, () => {
    const id = nextId++
    return { id, text: `${label} ${id}` }
  })
}
