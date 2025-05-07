import defu from 'defu'

const files = import.meta.glob(`./*.json`, { eager: true })

const result = Object.values(files).reduce<Record<string, unknown>>((acc, value) => {
  // @ts-expect-error type
  const moduleContent = value?.default || {}
  return defu(acc, moduleContent)
}, {})

export default result
