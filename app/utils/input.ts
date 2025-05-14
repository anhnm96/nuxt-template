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

export function getHTMLTextContentLength(htmlString: string) {
  // If the HTML is empty
  if (!htmlString) {
    return 0
  }

  let visibleCharCount = 0

  // Parse the HTML
  let inTag = false
  let inEntity = false
  let lastCharWasSpace = false // Track if the last character was a space

  for (let i = 0; i < htmlString.length; i++) {
    const char = htmlString[i]

    // Handle HTML tags
    if (char === '<') {
      inTag = true
      continue
    }

    if (inTag) {
      if (char === '>') {
        inTag = false
      }

      continue
    }

    // Handle HTML entities (like &nbsp; or &#123;)
    if (char === '&' && !inEntity) {
      inEntity = true
      continue
    }

    if (inEntity) {
      if (char === ';') {
        inEntity = false
        // HTML entities always count as 1 character
        visibleCharCount++
        lastCharWasSpace = false
      }

      continue
    }

    // Handle whitespace like a browser (collapse consecutive spaces)
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      if (!lastCharWasSpace) {
        // Only count the first space in a sequence
        visibleCharCount++
        lastCharWasSpace = true
      }

      continue
    }

    // Normal visible character
    visibleCharCount++
    lastCharWasSpace = false
  }

  return visibleCharCount
}

/**
 * Truncates HTML content to a specified length, counting only visible characters.
 * Handles whitespace like a browser:
 * - Spaces count as characters
 * - Multiple consecutive spaces count as one character
 * HTML tags are preserved and properly closed if truncation occurs.
 *
 * @param html The HTML content to truncate
 * @param maxLength The maximum number of visible characters
 * @param ellipsis The string to append when truncation occurs (default: '')
 * @returns The truncated HTML content with preserved tags
 */
export function truncateHtmlTextContent(html: string, maxLength: number, ellipsis: string = ''): string {
  // If the HTML is empty or maxLength is invalid
  if (!html || maxLength <= 0) {
    return ''
  }

  let visibleCharCount = 0
  let result = ''

  // Stack to keep track of open tags
  const openTags: string[] = []

  // Parse the HTML
  let inTag = false
  let currentTag = ''
  let inEntity = false
  let currentEntity = ''
  let lastCharWasSpace = false // Track if the last character was a space

  for (let i = 0; i < html.length; i++) {
    const char = html[i]

    // Handle HTML tags
    if (char === '<') {
      inTag = true
      currentTag = '<'
      continue
    }

    if (inTag) {
      currentTag += char

      if (char === '>') {
        inTag = false
        result += currentTag

        // Track opening tags for later closing if needed
        if (currentTag.match(/^<\s*([a-z]+)/i) && !currentTag.match(/\/\s*>$/) && !currentTag.match(/^<\s*\//) && !currentTag.match(/^<(img|br|hr|input|meta|link)/i)) {
          const tagMatch = currentTag.match(/^<\s*([a-z]+)/i)

          if (tagMatch && tagMatch[1]) {
            openTags.push(tagMatch[1])
          }
        }

        // Handle closing tags by removing from the stack
        if (currentTag.match(/^<\s*\//)) {
          const closeTagMatch = currentTag.match(/^<\s*\/\s*([a-z]+)/i)

          if (closeTagMatch && closeTagMatch[1] && openTags.length > 0) {
            const lastOpenTag = openTags[openTags.length - 1]

            if (lastOpenTag?.toLowerCase() === closeTagMatch[1].toLowerCase()) {
              openTags.pop()
            }
          }
        }

        currentTag = ''
      }

      continue
    }

    // Handle HTML entities (like &nbsp; or &#123;)
    if (char === '&' && !inEntity) {
      inEntity = true
      currentEntity = '&'
      continue
    }

    if (inEntity) {
      currentEntity += char

      if (char === ';') {
        inEntity = false
        result += currentEntity

        // HTML entities always count as 1 character and reset the space tracking
        visibleCharCount++
        lastCharWasSpace = false
        currentEntity = ''

        // Check if we've reached the limit
        if (visibleCharCount >= maxLength) {
          break
        }
      }

      continue
    }

    // Handle whitespace like a browser (collapse consecutive spaces)
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      if (!lastCharWasSpace) {
        // Only count the first space in a sequence
        result += ' ' // Always use a standard space
        visibleCharCount++
        lastCharWasSpace = true

        // Check if we've reached the limit
        if (visibleCharCount >= maxLength) {
          break
        }
      } else {
        // Still include the space in the result, but don't count it
        result += ' '
      }

      continue
    }

    // Normal visible character
    result += char
    visibleCharCount++
    lastCharWasSpace = false

    // Check if we've reached the limit
    if (visibleCharCount >= maxLength) {
      break
    }
  }

  // If we haven't processed the entire string, we need to add ellipsis
  if (visibleCharCount >= maxLength && html.length > result.length) {
    result += ellipsis

    // Close any open tags in reverse order
    for (let j = openTags.length - 1; j >= 0; j--) {
      result += `</${openTags[j]}>`
    }
  }

  return result
}
