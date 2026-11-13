import { POPOVER_HOST } from '../../app/components/base/popover/usePopover'

/** Adds the element that every Popover teleports into. In the browser, `app.vue` renders it. */
export function addPopoverHost() {
  const host = document.createElement('div')
  host.className = POPOVER_HOST.slice(1)
  document.body.appendChild(host)
  return host
}

/** Removes every Popover host, so the next test teleports into a fresh one. */
export function removePopoverHosts() {
  document.querySelectorAll(POPOVER_HOST).forEach(node => node.remove())
}
