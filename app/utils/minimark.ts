/** A node of a Content `minimark` body: text, or `[tag, props, ...children]`. */
export type MinimarkNode = string | [string, Record<string, unknown>, ...MinimarkNode[]]
