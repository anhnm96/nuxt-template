export default defineI18nLocale(async (locale: string) => {
  const result = (await import(`./locales/${locale}/index.ts`))
  return result?.default || {}
})
