<script setup lang="ts">
import Carousel from '~~/app/components/base/carousel/Carousel.vue'
import CarouselItem from '~~/app/components/base/carousel/CarouselItem.vue'
import amyChase from '~/assets/testimonials/amy-chase.jpg'
import conorNeville from '~/assets/testimonials/conor-neville.jpg'
import dillonLenora from '~/assets/testimonials/dillon-lenora.jpg'
import harrietArron from '~/assets/testimonials/harriet-arron.jpg'
import tinyYards from '~/assets/testimonials/tina-yards.jpg'
import veronicaWinton from '~/assets/testimonials/veronica-winton.jpg'

const testimonials = [
  {
    img: tinyYards,
    name: 'Tina Yards',
    title: 'VP of Sales, Protocol',
    quote:
      'Thanks to Radiant, we’re finding new leads that we never would have found with legal methods.',
  },
  {
    img: conorNeville,
    name: 'Conor Neville',
    title: 'Head of Customer Success, TaxPal',
    quote:
      'Radiant made undercutting all of our competitors an absolute breeze.',
  },
  {
    img: amyChase,
    name: 'Amy Chase',
    title: 'Head of GTM, Pocket',
    quote:
      'We closed a deal in literally a few minutes because we knew their exact budget.',
  },
  {
    img: veronicaWinton,
    name: 'Veronica Winton',
    title: 'CSO, Planeteria',
    quote:
      'We’ve managed to put two of our main competitors out of business in 6 months.',
  },
  {
    img: dillonLenora,
    name: 'Dillon Lenora',
    title: 'VP of Sales, Detax',
    quote: 'I was able to replace 80% of my team with RadiantAI bots.',
  },
  {
    img: harrietArron,
    name: 'Harriet Arron',
    title: 'Account Manager, Commit',
    quote:
      'I’ve smashed all my targets without having to speak to a lead in months.',
  },
]
</script>

<template>
  <section class="p-wrapper overflow-hidden py-32">
    <!-- titles -->
    <div class="wrapper">
      <h2 class="text-xs/5 font-semibold tracking-widest uppercase">
        What everyone is saying
      </h2>
      <h3 class="mt-2 max-w-xl font-display text-3xl tracking-tight text-pretty  sm:text-4.5xl">
        Trusted by professionals.
      </h3>
    </div>
    <!-- carousel -->
    <Carousel
      class="mt-16" items-class="flex overflow-x-auto gap-8
      px-(--scroll-padding) [--scroll-padding:max(--spacing(6),calc((100vw-(var(--container-2xl)))/2))]
      lg:[--scroll-padding:max(--spacing(8),calc((100vw-(var(--container-7xl)))/2))]" :items-to-list="1"
    >
      <template #default="{ activeIndex }">
        <CarouselItem
          v-for="(testimonial, index) in testimonials" :key="index"
          class="relative flex aspect-9/16 w-72 shrink-0 snap-start scroll-ml-(--scroll-padding) flex-col justify-end overflow-hidden rounded-3xl select-none sm:aspect-3/4 sm:w-96"
        >
          <img
            :alt="testimonial.name" :src="testimonial.img"
            class="absolute inset-x-0 top-0 aspect-square w-full object-cover"
          >
          <div
            aria-hidden="true"
            class="absolute inset-0 rounded-3xl bg-linear-to-t from-black from-[calc(7/16*100%)] ring-1 ring-gray-950/10 ring-inset sm:from-25%"
          />
          <figure class="relative p-10">
            <blockquote>
              <p class="relative text-xl/7 text-white">
                <span aria-hidden="true" class="absolute -translate-x-full">
                  “
                </span>
                {{ testimonial.quote }} {{ index }} - {{ activeIndex }}
                <span aria-hidden="true" class="absolute">
                  ”
                </span>
              </p>
            </blockquote>
            <figcaption class="mt-6 border-t border-white/20 pt-6">
              <p class="text-sm/6 font-medium text-white">
                {{ testimonial.name }}
              </p>
              <p class="text-sm/6 font-medium">
                <span
                  class="bg-linear-to-r from-[#fff1be] from-28% via-[#ee87cb] via-70% to-[#b060ff] bg-clip-text text-transparent"
                >
                  {{ testimonial.title }}
                </span>
              </p>
            </figcaption>
          </figure>
        </CarouselItem>
      </template>
      <template #footer="{ next, prev }">
        <div class="wrapper mt-16 flex justify-between">
          <!-- call to action -->
          <div>
            <p class="max-w-sm text-sm/6 text-slate-600 dark:text-slate-400">
              Join the best sellers in the business and start using Radiant to hit
              your targets today.
            </p>
            <div class="mt-2">
              <a href="#" class="inline-flex items-center gap-2 text-sm/6 font-medium text-pink-600 dark:text-pink-400">
                Get started
                <Icon size="20" name="tabler:arrow-narrow-right" />
              </a>
            </div>
          </div>
          <!-- controls -->
          <div class="hidden sm:flex sm:gap-2">
            <button class="btn btn-primary self-baseline" @click="prev()">
              <Icon size="16" name="lucide:chevron-left" />
            </button>
            <button class="btn btn-primary self-baseline" @click="next()">
              <Icon size="16" name="lucide:chevron-right" />
            </button>
          </div>
        </div>
      </template>
    </Carousel>
  </section>
</template>
