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

// #region truncate form fields
interface MaxLengthStructure {
  [key: string]: number | MaxLengthStructure
}

/**
 * truncate object props based on max rule
 * @example
 * truncateFields({ keyword: '12345', posts: [
    { title: '12345', content: '12345' },
    { title: '12345', content: '12345' },
  ], category: { name: 'categoryyyyyyyy' } },
    {
      keyword: 2,
      posts: { title: 3, content: 4 },
      category: { name: 8 },
    })
 * // returns {
    keyword: '12',
    posts: [
      { title: '123', content: '1234' },
      { title: '123', content: '1234' }
    ],
    category: { name: 'category' }
  }
 */
export function truncateFields(obj: any, max: MaxLengthStructure) {
  for (const [key, rule] of Object.entries(max)) {
    const value = obj[key]

    if (typeof rule === 'object') {
      if (Array.isArray(value)) {
        // Handle array case
        value.forEach((item) => {
          if (typeof item === 'object') {
            truncateFields(item, rule)
          }
        })
      } else if (typeof value === 'object') {
        // Handle nested object
        truncateFields(value, rule)
      }
    } else if (typeof value === 'string') {
      // Truncate string values
      if (value.length > rule) {
        obj[key] = value.slice(0, rule)
      }
    }
  }
}
// #endregion
