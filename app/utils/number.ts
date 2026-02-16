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

/**
 * Convert SVG string to data URL
 * @param {string} svgString - SVG markup as string
 * @returns {string} Data URL string
 */
export function svgToURL(svgString) {
  const uri = window.btoa(unescape(encodeURIComponent(svgString)))
  return `data:image/svg+xml;base64,${uri}`
}

/**
 * Generate a rotated cursor SVG based on rotation angle
 * @param {number} rotation - Rotation angle in degrees
 * @returns {string} Data URL string for the rotated cursor
 */
export function getRotatedCursor(rotation = 0) {
  const rotatedCursorSvg = `<svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="rotate(${rotation - 45} 13.5 13.5)" filter="url(#filter0_d_10127_472320)">
<mask id="path-1-outside-1_10127_472320" maskUnits="userSpaceOnUse" x="3.41406" y="2.41406" width="19" height="19" fill="black">
<rect fill="white" x="3.41406" y="2.41406" width="19" height="19"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.9496 4.41406L9.6567 5.12117L7.3192 7.45867C10.8627 7.53266 13.4961 8.07626 15.2539 9.70839C17.0371 11.3642 17.8068 14.0311 17.9035 18.0459L20.2425 15.707L20.9496 16.4141L17.4141 19.9496L13.8785 16.4141L14.5856 15.707L16.9026 18.0239C16.8027 14.1141 16.0476 11.8091 14.5742 10.4408C13.105 9.07657 10.8116 8.53652 7.33812 8.45944L9.6567 10.778L8.9496 11.4851L5.41406 7.9496L8.9496 4.41406Z"/>
</mask>
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.9496 4.41406L9.6567 5.12117L7.3192 7.45867C10.8627 7.53266 13.4961 8.07626 15.2539 9.70839C17.0371 11.3642 17.8068 14.0311 17.9035 18.0459L20.2425 15.707L20.9496 16.4141L17.4141 19.9496L13.8785 16.4141L14.5856 15.707L16.9026 18.0239C16.8027 14.1141 16.0476 11.8091 14.5742 10.4408C13.105 9.07657 10.8116 8.53652 7.33812 8.45944L9.6567 10.778L8.9496 11.4851L5.41406 7.9496L8.9496 4.41406Z" fill="black"/>
<path d="M9.6567 5.12117L10.3638 5.82828L11.0709 5.12117L10.3638 4.41406L9.6567 5.12117ZM8.9496 4.41406L9.6567 3.70696L8.9496 2.99985L8.24249 3.70696L8.9496 4.41406ZM7.3192 7.45867L6.6121 6.75156L4.95416 8.4095L7.29833 8.45845L7.3192 7.45867ZM15.2539 9.70839L15.9344 8.97559L15.9343 8.97557L15.2539 9.70839ZM17.9035 18.0459L16.9038 18.07L16.96 20.4036L18.6106 18.753L17.9035 18.0459ZM20.2425 15.707L20.9496 14.9998L20.2425 14.2927L19.5354 14.9998L20.2425 15.707ZM20.9496 16.4141L21.6567 17.1212L22.3638 16.4141L21.6567 15.707L20.9496 16.4141ZM17.4141 19.9496L16.707 20.6567L17.4141 21.3638L18.1212 20.6567L17.4141 19.9496ZM13.8785 16.4141L13.1714 15.707L12.4643 16.4141L13.1714 17.1212L13.8785 16.4141ZM14.5856 15.707L15.2927 14.9998L14.5856 14.2927L13.8785 14.9998L14.5856 15.707ZM16.9026 18.0239L16.1955 18.731L17.9662 20.5018L17.9023 17.9984L16.9026 18.0239ZM14.5742 10.4408L15.2547 9.70803L15.2547 9.70801L14.5742 10.4408ZM7.33812 8.45944L7.3603 7.45969L4.86887 7.4044L6.63101 9.16655L7.33812 8.45944ZM9.6567 10.778L10.3638 11.4851L11.0709 10.778L10.3638 10.0709L9.6567 10.778ZM8.9496 11.4851L8.24249 12.1922L8.9496 12.8993L9.6567 12.1922L8.9496 11.4851ZM5.41406 7.9496L4.70696 7.24249L3.99985 7.9496L4.70696 8.6567L5.41406 7.9496ZM9.6567 5.12117L10.3638 4.41406L9.6567 3.70696L8.9496 4.41406L8.24249 5.12117L8.9496 5.82828L9.6567 5.12117ZM7.3192 7.45867L8.02631 8.16578L10.3638 5.82828L9.6567 5.12117L8.9496 4.41406L6.6121 6.75156L7.3192 7.45867ZM7.3192 7.45867L7.29833 8.45845C10.806 8.53169 13.1052 9.07783 14.5735 10.4412L15.2539 9.70839L15.9343 8.97557C13.8871 7.0747 10.9194 6.53363 7.34008 6.45889L7.3192 7.45867ZM15.2539 9.70839L14.5735 10.4412C16.0487 11.811 16.8087 14.1233 16.9038 18.07L17.9035 18.0459L18.9032 18.0219C18.8049 13.9389 18.0256 10.9174 15.9344 8.97559L15.2539 9.70839ZM20.2425 15.707L19.5354 14.9998L17.1964 17.3388L17.9035 18.0459L18.6106 18.753L20.9496 16.4141L20.2425 15.707ZM20.9496 16.4141L21.6567 15.707L20.9496 14.9998L20.2425 15.707L19.5354 16.4141L20.2425 17.1212L20.9496 16.4141ZM17.4141 19.9496L18.1212 20.6567L21.6567 17.1212L20.9496 16.4141L20.2425 15.707L16.707 19.2425L17.4141 19.9496ZM13.8785 16.4141L13.1714 17.1212L16.707 20.6567L17.4141 19.9496L18.1212 19.2425L14.5856 15.707L13.8785 16.4141ZM14.5856 15.707L13.8785 14.9998L13.1714 15.707L13.8785 16.4141L14.5856 17.1212L15.2927 16.4141L14.5856 15.707ZM16.9026 18.0239L17.6097 17.3168L15.2927 14.9998L14.5856 15.707L13.8785 16.4141L16.1955 18.731L16.9026 18.0239ZM16.9026 18.0239L17.9023 17.9984C17.8007 14.0205 17.0354 11.3617 15.2547 9.70803L14.5742 10.4408L13.8937 11.1736C15.0599 12.2565 15.8048 14.2078 15.9029 18.0495L16.9026 18.0239ZM14.5742 10.4408L15.2547 9.70801C13.4962 8.07512 10.8684 7.53753 7.3603 7.45969L7.33812 8.45944L7.31593 9.45919C10.7549 9.5355 12.7139 10.078 13.8938 11.1736L14.5742 10.4408ZM9.6567 10.778L10.3638 10.0709L8.04523 7.75233L7.33812 8.45944L6.63101 9.16655L8.9496 11.4851L9.6567 10.778ZM8.9496 11.4851L9.6567 12.1922L10.3638 11.4851L9.6567 10.778L8.9496 10.0709L8.24249 10.778L8.9496 11.4851ZM5.41406 7.9496L4.70696 8.6567L8.24249 12.1922L8.9496 11.4851L9.6567 10.778L6.12117 7.24249L5.41406 7.9496ZM8.9496 4.41406L8.24249 3.70696L4.70696 7.24249L5.41406 7.9496L6.12117 8.6567L9.6567 5.12117L8.9496 4.41406Z" fill="white" mask="url(#path-1-outside-1_10127_472320)"/>
</g>
<defs>
<filter id="filter0_d_10127_472320" x="0" y="0" width="26.3633" height="26.3633" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="1"/>
<feGaussianBlur stdDeviation="2"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 1 0"/>
<feBlend mode="multiply" in2="BackgroundImageFix" result="effect1_dropShadow_10127_472320"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_10127_472320" result="shape"/>
</filter>
</defs>
</svg>`
  return svgToURL(rotatedCursorSvg)
}
