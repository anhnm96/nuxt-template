export default defineI18nLocale(async (locale: string) => {
  const result = (await import(`./${locale}/index.ts`))
  return result?.default || {}
})
