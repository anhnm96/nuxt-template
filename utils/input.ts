export function filterInputValue(event: Event, filterFn: (value: string) => string) {
  const target = event.target as HTMLInputElement
  const value = target?.value ?? ''
  const filteredValue = filterFn(value)
  let cursorPosition = target?.selectionStart || 0

  if (!target) {
    return ''
  }

  cursorPosition = Math.max(0, cursorPosition - (value.length - filteredValue.length))

  target.value = filteredValue
  target.selectionStart = cursorPosition
  target.selectionEnd = cursorPosition

  return filteredValue
}

export function filterNumberUpperAlphaUnderscoreOnly(value: string = '') {
  return value.replace(/[^A-Z0-9_]/g, '')
}
