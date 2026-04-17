/**
 * Safely parse JSON containing large integers that would normally lose precision
 * @param jsonString - JSON string to parse
 * @param fields - array of field names to target (e.g., ['id', 'ticket_no'])
 * @returns Parsed JSON with large integers preserved as strings
 * usage: apply when calling api in FetchOptions
 * type: 'text',
 * parseResponse (responseText) {
 *   return parseJsonBigInt(responseText, ['ticket_no']);
 * }
 */
export function parseJsonBigInt(jsonString: string, fields: string[]) {
  let preprocessedText = jsonString

  if (fields && fields.length > 0) {
    // Process only specific fields
    fields.forEach((field) => {
      // Create a regex that matches the specific field name followed by a colon and any number
      // This will convert all numeric values for the specified fields to strings
      const fieldRegex = new RegExp(`"${field}"\\s*:(\\s*)(\\d+)([,}\\]])`, 'g')

      preprocessedText = preprocessedText.replace(
        fieldRegex,
        (_match, whitespace, number, delimiter) => {
          // Convert matched field to string
          return `"${field}"${whitespace}:"${number}"${delimiter}`
        },
      )
    })
  }

  return JSON.parse(preprocessedText)
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}
