export function useFullViewMode() {
  const isFullViewMode = ref(false)
  const dialogStore = useDialogStore()

  function handleKeyboardShortcuts(event: KeyboardEvent) {
    const isAltEnterPressed = event.altKey && event.key === 'Enter'
    const isEscapePressed = event.key === 'Escape'

    // already in full view mode
    if (isFullViewMode.value) {
      if (isEscapePressed && dialogStore.dialogs.length === 0) {
        toggleFullViewMode(false)
      }

      return
    }

    // not in full view mode
    if (isAltEnterPressed) {
      toggleFullViewMode(true)
    }
  };
  useEventListener('keydown', handleKeyboardShortcuts)

  const { show } = useToast()
  function toggleFullViewMode(value?: boolean) {
    isFullViewMode.value = value ?? !isFullViewMode.value

    if (isFullViewMode.value) {
      show({
        severity: 'info',
        description: 'Press the ESC key to exit full screen mode.',
        duration: 3000,
      })
    }
  }

  return {
    isFullViewMode,
    toggleFullViewMode,
  }
}
