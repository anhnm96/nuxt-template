<script lang="ts" setup>
const logos = [
  { cls: '', src: 'logos:nuxt-icon', alt: 'Nuxt', href: 'https://nuxt.com', column: 1, row: 1 },
  { cls: '', src: 'catppuccin:rust', alt: 'Rust', href: 'https://doc.rust-lang.org/stable/std/index.html', column: 1, row: 2 },
  { cls: '', src: 'logos:webassembly', alt: 'Webassembly', href: 'https://webassembly.org', column: 1, row: 3 },
  { cls: '', src: 'logos:gopher', alt: 'Go', href: 'https://go.dev', column: 2, row: 2 },
  { cls: '', src: 'logos:zod', alt: 'Zod', href: 'https://zod.dev', column: 2, row: 3 },
  { cls: '', src: 'logos:redis', alt: 'Redis', href: 'https://redis.io', column: 2, row: 4 },
  { cls: '', src: 'logos:pinia', alt: 'Pinia', href: 'https://pinia.vuejs.org/', column: 2, row: 5 },
  { cls: '', src: 'logos:react-query-icon', alt: 'Tanstack Query', href: 'https://tanstack.com/query/latest/docs/framework/vue/overview', column: 2, row: 6 },
  { cls: '', src: 'logos:tailwindcss-icon', alt: 'UnoCSS', href: 'https://tailwindcss.com', column: 3, row: 3 },
  { cls: '', src: 'logos:pwa', alt: 'PWA', href: 'https://web.dev/learn/pwa', column: 3, row: 4 },
  { cls: '', src: 'catppuccin:drizzle-orm', alt: 'drizzle', href: 'https://orm.drizzle.team/', column: 3, row: 5 },
  { cls: '', src: 'logos:playwright', alt: 'Playwright', href: 'https://playwright.dev', column: 4, row: 1 },
  { cls: '', src: 'logos:msw', alt: 'MSW', href: 'https://mswjs.io', column: 4, row: 2 },
  { cls: '', src: 'logos:faker', alt: 'Faker.js', href: 'https://fakerjs.dev/', column: 4, row: 3 },
  { cls: '', src: 'logos:vitest', alt: 'Vitest', href: 'https://vitest.dev', column: 4, row: 4 },
  { cls: '', src: 'logos:testing-library', alt: 'Testing Library', href: 'https://testing-library.com', column: 4, row: 5 },
  { cls: '', src: 'logos:docker-icon', alt: 'Docker', href: 'https://www.docker.com', column: 4, row: 6 },
  { cls: '', src: 'logos:typescript-icon', alt: 'TypeScript', href: 'https://typescriptlang.org', column: 5, row: 2 },
  { cls: '', src: 'vscode-icons:file-type-histoire', alt: 'Histoire', href: 'https://histoire.dev', column: 5, row: 3 },
  { cls: '', src: 'logos:github-icon', alt: 'GitHub', href: 'https://github.com', column: 5, row: 4 },
  { cls: '', src: 'logos:sentry', alt: 'Sentry', href: 'https://sentry.io', column: 5, row: 5 },
] as const

const columnClasses: Record<(typeof logos)[number]['column'], string> = {
  1: 'xl:col-start-1',
  2: 'xl:col-start-2',
  3: 'xl:col-start-3',
  4: 'xl:col-start-4',
  5: 'xl:col-start-5',
}
const rowClasses: Record<(typeof logos)[number]['row'], string> = {
  1: 'xl:row-start-1',
  2: 'xl:row-start-2',
  3: 'xl:row-start-3',
  4: 'xl:row-start-4',
  5: 'xl:row-start-5',
  6: 'xl:row-start-6',
}
</script>

<template>
  <ul
    class="flex max-w-3xl flex-wrap justify-center gap-2 sm:gap-4 xl:row-span-6 xl:grid xl:grid-flow-col xl:grid-cols-5 xl:grid-rows-subgrid"
  >
    <li
      v-for="(logo, index) in logos"
      :key="logo.alt"
      :style="{ '--loop-index': index }"
      :class="
        clsx(
          columnClasses[logo.column],
          rowClasses[logo.row],
          'animate-fade-in motion-safe:animate-roll-reveal',
          'motion-safe:![animation-delay:calc(0.07s*var(--loop-index))]',
        )
      "
    >
      <a
        :href="logo.href"
        class="grid size-20 place-items-center rounded-2xl bg-primary-100 p-4 transition hover:-rotate-6 hover:bg-primary-200 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-hidden sm:size-24 "
        :class="logo.cls"
      >
        <Icon class="!size-full" :name="logo.src" :atl="logo.alt" />
      </a>
    </li>
  </ul>
</template>
