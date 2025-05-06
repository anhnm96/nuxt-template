const result: Record<string, unknown> = {}
const files = import.meta.glob(`./*.json`, { eager: true })

for (const [_key, value] of Object.entries(files)) {
  // @ts-expect-error type
  const moduleContent = value?.default || {}

  Object.assign(result, moduleContent)
}

export default result
