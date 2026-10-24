import type { App, ShallowRef } from 'vue'
import { getCurrentInstance, shallowReactive, shallowRef } from 'vue'

export const HANDOFF_MS = 180
export const HANDOFF_WAIT_MS = 100

export interface TooltipMember {
  id: string
  anchor: ShallowRef<HTMLElement | null>
  target: ShallowRef<HTMLElement | null>
  options: () => {
    placement: 'top' | 'bottom' | 'left' | 'right'
    offset: number
    animate: string
    attrs: Record<string, unknown>
  }
  deactivate: () => void
  finish: () => void
  leave: () => void
  enter: () => void
}

export interface TooltipGroup {
  name: string
  current: TooltipMember | null
  previous: TooltipMember | null
  open: boolean
  revision: number
  morph: boolean
  element: ShallowRef<HTMLElement | null>
  timer?: ReturnType<typeof setTimeout>
}

function createGroups() {
  const groups = shallowReactive(new Map<string, TooltipGroup>())
  const hosts = shallowRef(0)

  function finishPrevious(group: TooltipGroup) {
    clearTimeout(group.timer)
    group.timer = undefined
    const previous = group.previous
    group.previous = null
    previous?.finish()
  }

  function activate(name: string, member: TooltipMember, motion: boolean) {
    let group = groups.get(name)
    if (!group) {
      group = shallowReactive<TooltipGroup>({
        name,
        current: null,
        previous: null,
        open: false,
        revision: 0,
        morph: false,
        element: shallowRef(null),
      })
      groups.set(name, group)
    }
    // Reclaim a fading member before disposing the older outgoing layer.
    if (group.previous === member) group.previous = null
    finishPrevious(group)
    const outgoing = group.current
    group.morph = Boolean(outgoing && outgoing !== member && motion)
    group.revision++
    group.open = true
    group.current = member
    if (outgoing && outgoing !== member) {
      outgoing.deactivate()
      if (group.morph) {
        group.previous = outgoing
        group.timer = setTimeout(() => finishPrevious(group!), HANDOFF_MS)
      } else outgoing.finish()
    }
    return group
  }

  function close(group: TooltipGroup, member: TooltipMember) {
    if (group.current !== member) return
    group.open = false
    group.revision++
    finishPrevious(group)
  }

  function finishClose(group: TooltipGroup, revision: number) {
    if (group.open || group.revision !== revision) return
    const current = group.current
    group.current = null
    finishPrevious(group)
    current?.finish()
    groups.delete(group.name)
  }

  function remove(group: TooltipGroup, member: TooltipMember) {
    if (group.previous === member) finishPrevious(group)
    if (group.current === member) {
      close(group, member)
      finishClose(group, group.revision)
    }
  }

  function clear() {
    for (const group of groups.values()) {
      group.current?.deactivate()
      group.open = false
      finishClose(group, group.revision)
    }
  }

  return { groups, hosts, activate, close, finishClose, remove, clear }
}

type TooltipGroups = ReturnType<typeof createGroups>
const registries = new WeakMap<App, TooltipGroups>()

/** App-scoped, so separate Vue apps and SSR requests never share live members. */
export function useTooltipGroups(): TooltipGroups {
  const app = getCurrentInstance()!.appContext.app
  let registry = registries.get(app)
  if (!registry) {
    registry = createGroups()
    registries.set(app, registry)
  }
  return registry
}
