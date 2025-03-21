interface AddEventProps {
  evtName: string
  listener: () => void
  options?: AddEventListenerOptions
}

export function useAnchor(anchorEvents: AddEventProps[]) {
  const { props, proxy } = getCurrentInstance()!

  const anchorEl = shallowRef<HTMLElement | null>(null)

  function registerEvents() {
    for (const event of anchorEvents) {
      anchorEl.value?.addEventListener(event.evtName, event.listener, event.options)
    }
  }

  function unregisterEvents() {
    for (const event of anchorEvents) {
      anchorEl.value?.removeEventListener(event.evtName, event.listener, event.options)
    }
  }

  function setAnchorEl(el: HTMLElement) {
    anchorEl.value = el
    registerEvents()
  }

  function pickAnchorEl() {
    if (props.target === false || props.target === '' || proxy?.$el.parentNode === null) {
      anchorEl.value = null
    } else if (props.target === true) {
      setAnchorEl(proxy?.$el.parentNode)
    } else {
      let el = props.target

      if (typeof props.target === 'string') {
        el = document.querySelector(props.target)
      }

      if (el) {
        setAnchorEl(el as HTMLElement)
      } else {
        anchorEl.value = null
        console.error(`Anchor: target "${props.target}" not found`)
      }
    }
  }

  watch(() => props.target, (oldVal) => {
    if (oldVal !== null) {
      unregisterEvents()
    }

    pickAnchorEl()
  })

  onMounted(() => {
    pickAnchorEl()
  })

  onBeforeUnmount(() => {
    unregisterEvents()
  })

  return {
    anchorEl,
  }
}
