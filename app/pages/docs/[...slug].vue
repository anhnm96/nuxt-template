<script setup lang="ts">
import type { TocItem } from '~/utils/docsToc'

// One catch-all route. Do not add `pages/docs/components/...`: `pages:extend` in nuxt.config.ts
// removes any page whose path contains "components".
definePageMeta({
  key: route => route.path,
})

const route = useRoute()
const segments = computed(() => {
  const slug = route.params.slug
  return (Array.isArray(slug) ? slug : [slug]).filter(Boolean) as string[]
})

/** `base/select/README` -> `select`. */
function componentName(stem: string) {
  return stem.split('/').slice(-2, -1)[0]!.toLowerCase()
}

const { data: readmes } = await useAsyncData('docs-readmes', () =>
  queryCollection('componentReadme').select('stem', 'title').all())
const { data: designs } = await useAsyncData('docs-designs', () =>
  queryCollection('componentDesign').select('stem').all())
const { data: adrs } = await useAsyncData('docs-adrs', () =>
  queryCollection('adr').select('stem', 'title').order('stem', 'ASC').all())
const { data: composableList } = await useAsyncData('docs-composables', () =>
  queryCollection('composable').select('stem', 'title').order('stem', 'ASC').all())
const { data: directiveList } = await useAsyncData('docs-directives', () =>
  queryCollection('directive').select('stem', 'title').order('stem', 'ASC').all())

const components = computed(() =>
  (readmes.value ?? [])
    .map(r => ({ name: componentName(r.stem), title: r.title, stem: r.stem }))
    .sort((a, b) => a.name.localeCompare(b.name)))

type View
  = | { kind: 'getting-started' }
    | { kind: 'components-index' }
    | { kind: 'component', name: string }
    | { kind: 'glossary' }
    | { kind: 'adr-index' }
    | { kind: 'adr', slug: string }
    | { kind: 'composables-index' }
    | { kind: 'composable', slug: string }
    | { kind: 'directives-index' }
    | { kind: 'directive', slug: string }
    | { kind: 'none' }

const view = computed<View>(() => {
  const [top, a, b, extra] = segments.value
  if (!top) return { kind: 'getting-started' }
  if (extra || (b && (top !== 'reference' || a !== 'adr'))) return { kind: 'none' }
  if (top === 'components') return a ? { kind: 'component', name: a } : { kind: 'components-index' }
  if (top === 'composables') return a ? { kind: 'composable', slug: a } : { kind: 'composables-index' }
  if (top === 'directives') return a ? { kind: 'directive', slug: a } : { kind: 'directives-index' }
  if (top === 'reference' && a === 'glossary') return { kind: 'glossary' }
  if (top === 'reference' && a === 'adr') return b ? { kind: 'adr', slug: b } : { kind: 'adr-index' }
  return { kind: 'none' }
})

// The Glossary and the ADRs belong to the Components section, where the DESIGN files cite them.
const section = computed<'getting-started' | 'components' | 'composables' | 'directives'>(() => {
  const top = segments.value[0]
  if (!top) return 'getting-started'
  return top === 'composables' || top === 'directives' ? top : 'components'
})

const topNav = [
  { label: 'Start here', to: '/docs', section: 'getting-started' },
  { label: 'Components', to: '/docs/components', section: 'components' },
  { label: 'Composables', to: '/docs/composables', section: 'composables' },
  { label: 'Directives', to: '/docs/directives', section: 'directives' },
] as const

// The page key remounts this route when the path changes. Query changes only switch tabs.
const { data: page } = await useAsyncData(
  `docs-page-${route.path}`,
  async () => {
    const v = view.value
    if (v.kind === 'component') {
      const entry = components.value.find(c => c.name === v.name)
      if (!entry) return { readme: null, design: null, fromDir: '' }
      const designStem = (designs.value ?? []).find(d => componentName(d.stem) === v.name)?.stem
      const [readme, design] = await Promise.all([
        queryCollection('componentReadme').where('stem', '=', entry.stem).first(),
        designStem ? queryCollection('componentDesign').where('stem', '=', designStem).first() : null,
      ])
      return { readme, design, fromDir: entry.stem.split('/').slice(0, -1).join('/') }
    }
    if (v.kind === 'glossary') {
      return { readme: await queryCollection('glossary').first(), design: null, fromDir: '' }
    }
    if (v.kind === 'adr') {
      return { readme: await queryCollection('adr').where('stem', '=', v.slug).first(), design: null, fromDir: '' }
    }
    if (v.kind === 'composable') {
      return { readme: await queryCollection('composable').where('stem', '=', v.slug).first(), design: null, fromDir: '' }
    }
    if (v.kind === 'directive') {
      return { readme: await queryCollection('directive').where('stem', '=', v.slug).first(), design: null, fromDir: '' }
    }
    return { readme: null, design: null, fromDir: '' }
  },
)

const needsDoc = ['component', 'glossary', 'adr', 'composable', 'directive']
if (needsDoc.includes(view.value.kind) && !page.value?.readme) {
  throw createError({ statusCode: 404, statusMessage: 'Docs page not found', fatal: true })
}
if (view.value.kind === 'none') {
  throw createError({ statusCode: 404, statusMessage: 'Docs page not found', fatal: true })
}

// Demo: the existing Playground page, mounted client-only. `-types` pages are never a Demo.
const demos = import.meta.glob('~/pages/playground/*.vue')
const demo = computed(() => {
  if (view.value.kind !== 'component') return undefined
  const page = playgroundFor(view.value.name)
  const key = page && Object.keys(demos).find(k => k.endsWith(`/playground/${page}.vue`))
  return key ? defineAsyncComponent(demos[key] as any) : undefined
})

// A tab exists only when it has content. `?tab=` names one, and an unknown name falls back to Usage.
type DocsTab = 'readme' | 'demo' | 'design'
const tabs = computed<{ id: DocsTab, label: string, query: Record<string, string> }[]>(() => [
  { id: 'readme', label: 'Usage', query: {} },
  ...(demo.value ? [{ id: 'demo' as const, label: 'Demo', query: { tab: 'demo' } }] : []),
  ...(page.value?.design ? [{ id: 'design' as const, label: 'Design', query: { tab: 'design' } }] : []),
])
const tab = computed<DocsTab>(() => tabs.value.find(t => t.id === route.query.tab)?.id ?? 'readme')

const shown = computed(() => {
  const p = page.value
  const doc = tab.value === 'design' && p?.design ? p.design : p?.readme
  return doc && p ? { ...doc, body: rewriteBodyLinks(doc.body, p.fromDir) } : null
})

// "On this page": the headings of the shown doc. The Demo tab has none.
const toc = computed<TocItem[]>(() => tab.value === 'demo' ? [] : extractToc(shown.value?.body))

const sidebarLink = 'block rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10'
const sidebarActive = 'bg-primary/10 font-semibold text-primary'
</script>

<template>
  <div class="min-h-svh">
    <!-- top navigation -->
    <nav class="sticky top-0 z-20 h-12 border-b border-black/10 bg-surface dark:border-white/10" aria-label="Docs sections">
      <ul class="mx-auto flex h-full max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
        <li v-for="item in topNav" :key="item.section">
          <NuxtLink
            :to="item.to"
            class="flex h-full items-center border-b-2 px-2 text-sm whitespace-nowrap sm:px-3"
            :class="section === item.section ? 'border-primary font-semibold text-primary' : 'border-transparent opacity-70 hover:opacity-100'"
            :aria-current="section === item.section ? 'page' : undefined"
          >
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:gap-8 md:px-6">
      <!-- sidebar -->
      <nav v-if="section !== 'getting-started'" class="max-h-40 overflow-y-auto md:sticky md:top-[4.5rem] md:max-h-[calc(100svh-6rem)] md:w-56 md:shrink-0 md:self-start" aria-label="Pages">
        <template v-if="section === 'components'">
          <p class="mb-2 text-xs font-semibold tracking-wide uppercase opacity-60">
            Components
          </p>
          <ul class="space-y-1">
            <li v-for="c in components" :key="c.name">
              <NuxtLink :to="`/docs/components/${c.name}`" :class="sidebarLink" :active-class="sidebarActive">
                {{ c.title || c.name }}
              </NuxtLink>
            </li>
          </ul>

          <p class="mt-6 mb-2 text-xs font-semibold tracking-wide uppercase opacity-60">
            Reference
          </p>
          <ul class="space-y-1">
            <li>
              <NuxtLink to="/docs/reference/glossary" :class="sidebarLink" :active-class="sidebarActive">
                Glossary
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/docs/reference/adr" :class="sidebarLink" :active-class="sidebarActive">
                Decisions (ADR)
              </NuxtLink>
            </li>
          </ul>
        </template>

        <template v-else-if="section === 'composables'">
          <p class="mb-2 text-xs font-semibold tracking-wide uppercase opacity-60">
            Composables
          </p>
          <ul class="space-y-1">
            <li v-for="c in composableList ?? []" :key="c.stem">
              <NuxtLink :to="`/docs/composables/${c.stem}`" :class="sidebarLink" :active-class="sidebarActive">
                {{ c.title || c.stem }}
              </NuxtLink>
            </li>
          </ul>
        </template>

        <template v-else>
          <p class="mb-2 text-xs font-semibold tracking-wide uppercase opacity-60">
            Directives
          </p>
          <ul class="space-y-1">
            <li v-for="d in directiveList ?? []" :key="d.stem">
              <NuxtLink :to="`/docs/directives/${d.stem}`" :class="sidebarLink" :active-class="sidebarActive">
                {{ d.title || d.stem }}
              </NuxtLink>
            </li>
          </ul>
        </template>
      </nav>

      <main class="min-w-0 flex-1">
        <article v-if="view.kind === 'getting-started'" class="docs-prose max-w-prose">
          <h1>Getting Started</h1>
          <p>
            Use these docs when building features with the shared UI in this app.
          </p>
          <ul>
            <li>
              <NuxtLink to="/docs/components">
                Components
              </NuxtLink> for ready-to-use interface elements and their props, events, and slots.
            </li>
            <li>
              <NuxtLink to="/docs/composables">
                Composables
              </NuxtLink> for reusable state and behavior in Vue setup code.
            </li>
            <li>
              <NuxtLink to="/docs/directives">
                Directives
              </NuxtLink> for behavior attached directly to an element, such as focus or outside-click handling.
            </li>
          </ul>
          <p>
            Start with Usage on a component page. Where available, Demo opens the component playground and Design explains implementation decisions.
          </p>
        </article>

        <template v-else-if="view.kind === 'components-index'">
          <h1 class="mb-4 text-3xl font-bold">
            Components
          </h1>
          <ul class="grid gap-2 sm:grid-cols-2">
            <li v-for="c in components" :key="c.name">
              <NuxtLink :to="`/docs/components/${c.name}`" class="block rounded border border-black/10 px-3 py-2 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                {{ c.title || c.name }}
              </NuxtLink>
            </li>
          </ul>
        </template>

        <template v-else-if="view.kind === 'composables-index'">
          <h1 class="mb-4 text-3xl font-bold">
            Composables
          </h1>
          <ul v-if="composableList?.length" class="space-y-1">
            <li v-for="c in composableList" :key="c.stem">
              <NuxtLink :to="`/docs/composables/${c.stem}`" class="underline">
                {{ c.title || c.stem }}
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="opacity-70">
            No composable is documented yet.
          </p>
        </template>

        <template v-else-if="view.kind === 'directives-index'">
          <h1 class="mb-4 text-3xl font-bold">
            Directives
          </h1>
          <ul v-if="directiveList?.length" class="space-y-1">
            <li v-for="d in directiveList" :key="d.stem">
              <NuxtLink :to="`/docs/directives/${d.stem}`" class="underline">
                {{ d.title || d.stem }}
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="opacity-70">
            No directive is documented yet.
          </p>
        </template>

        <template v-else-if="view.kind === 'adr-index'">
          <h1 class="mb-4 text-3xl font-bold">
            Decisions (ADR)
          </h1>
          <ul class="space-y-1">
            <li v-for="a in adrs ?? []" :key="a.stem">
              <NuxtLink :to="`/docs/reference/adr/${a.stem}`" class="underline">
                {{ a.title || a.stem }}
              </NuxtLink>
            </li>
          </ul>
        </template>

        <template v-else-if="shown">
          <nav v-if="tabs.length > 1" class="sticky top-12 z-10 mb-6 flex gap-2 border-b border-black/10 bg-surface py-2 dark:border-white/10" aria-label="Component documentation">
            <NuxtLink
              v-for="t in tabs" :key="t.id"
              :aria-current-value="tab === t.id ? 'page' : 'false'" :to="{ query: t.query }"
              class="rounded px-3 py-1 text-sm"
              :class="tab === t.id ? 'bg-primary/10 font-semibold text-primary' : 'opacity-70 hover:opacity-100'"
            >
              {{ t.label }}
            </NuxtLink>
          </nav>

          <!-- demo -->
          <section v-if="tab === 'demo' && demo">
            <h1 class="mb-4 text-3xl font-bold">
              {{ shown.title }}
            </h1>
            <ClientOnly>
              <div class="rounded border border-black/10 p-4 dark:border-white/10">
                <component :is="demo" />
              </div>
            </ClientOnly>
          </section>

          <!-- usage and design -->
          <article v-else class="docs-prose">
            <ContentRenderer :value="shown" />
          </article>
        </template>
      </main>

      <!-- on this page -->
      <aside v-if="toc.length" class="hidden w-52 shrink-0 xl:block">
        <div class="sticky top-[4.5rem] max-h-[calc(100svh-6rem)] overflow-y-auto">
          <DocsToc :items="toc" />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.docs-prose :deep(h1) { font-size: 1.875rem; font-weight: 700; margin: 0 0 1rem; }
.docs-prose :deep(h2) { font-size: 1.375rem; font-weight: 600; margin: 2rem 0 0.75rem; }
.docs-prose :deep(h3) { font-size: 1.125rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
.docs-prose :deep(p) { margin: 0.75rem 0; line-height: 1.65; }
.docs-prose :deep(ul) { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
.docs-prose :deep(ol) { list-style: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
.docs-prose :deep(pre) { overflow-x: auto; padding: 0.75rem 1rem; margin: 1rem 0; border-radius: 0.5rem; background: rgb(0 0 0 / 0.06); font-size: 0.8125rem; }
.docs-prose :deep(:not(pre) > code) { padding: 0.1rem 0.3rem; border-radius: 0.25rem; background: color-mix(in srgb, var(--color-primary) 12%, transparent); font-size: 0.875em; }
.docs-prose :deep(a) { color: var(--color-primary); text-decoration: none; }
.docs-prose :deep(a:hover) { text-decoration: underline; }
/* Content wraps each heading in its own anchor; the heading keeps the text color. */
.docs-prose :deep(:is(h1, h2, h3, h4) a) { color: inherit; text-decoration: none; }
/* Clears the sticky section nav (3rem) and the sticky tab bar (about 3rem), plus a little air. */
.docs-prose :deep(:is(h2, h3)) { scroll-margin-top: 7rem; }
.docs-prose :deep(.docs-unlinked) { font-family: ui-monospace, monospace; font-size: 0.875em; opacity: 0.85; }
.docs-prose :deep(table) { border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
.docs-prose :deep(th), .docs-prose :deep(td) { border: 1px solid rgb(127 127 127 / 0.3); padding: 0.375rem 0.625rem; text-align: left; }
:global(html.dark) .docs-prose :deep(pre) { background: rgb(255 255 255 / 0.06); }
</style>
