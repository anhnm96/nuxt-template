<script setup lang="ts">
defineProps<{
  name: string
  price: string
  description: string
  href: string
  features: string[]
  featured?: boolean
}>()
</script>

<template>
  <section
    class="flex flex-col rounded-3xl px-6 sm:px-8" :class="[featured ? 'order-first bg-primary-600 py-8 lg:order-0' : 'dark lg:py-8']"
  >
    <h3 class="mt-5 font-display text-lg text-white">
      {{ name }}
    </h3>
    <p
      class="mt-2 text-base" :class="[featured ? 'text-white' : 'text-slate-400']"
    >
      {{ description }}
    </p>
    <p class="order-first font-display text-5xl font-light tracking-tight text-white">
      {{ price }}
    </p>
    <ul
      class="order-last mt-10 flex flex-col gap-y-3 text-sm" :class="[featured ? 'text-white' : 'text-slate-200']"
    >
      <li v-for="feature in features" :key="feature" class="flex items-center">
        <Icon size="24" :class="[featured ? 'text-white' : 'text-slate-400']" name="ph:check-circle" />
        <span class="ml-4">{{ feature }}</span>
      </li>
    </ul>
    <button
      :class="featured ? 'btn-white' : 'btn-outline'"
      class="btn mt-8 h-10 rounded-full font-semibold"
      :aria-label="`Get started with the ${name} plan for ${price}`"
    >
      Get started
    </button>
  </section>
</template>
