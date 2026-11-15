<script setup lang="ts">
import Carousel from '~/components/base/carousel/Carousel.vue'
import CarouselItem from '~/components/base/carousel/CarouselItem.vue'

const cards = ref(Array.from({ length: 8 }, (_, index) => `Card ${index + 1}`))
const slides = ['One', 'Two', 'Three', 'Four']
const clicks = ref(0)
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-10 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Default — `prev` and `next` move by the items that fit
      </h2>
      <p class="text-sm opacity-70">
        Drag with the mouse, or scroll with a touch or a trackpad. With `repeat`, `next` at the
        end goes to the start.
      </p>
      <!-- px-px: the browser can cut a border that is exactly at the edge of the carousel.
           scroll-px-px: snap then stops an item at the padding and not at the edge -->
      <Carousel items-class="gap-4 px-px scroll-px-px">
        <CarouselItem v-for="card in cards" :key="card" class="card w-40">
          {{ card }}
        </CarouselItem>
        <template #footer="{ activeIndex, prev, next }">
          <div class="mt-2 flex items-center gap-2">
            <button type="button" class="btn" aria-label="Previous" @click="prev()">
              ‹
            </button>
            <button type="button" class="btn" aria-label="Next" @click="next()">
              ›
            </button>
            <span class="text-sm opacity-70">first item: {{ activeIndex + 1 }}</span>
            <button type="button" class="btn ml-auto" @click="cards.push(`Card ${cards.length + 1}`)">
              Add
            </button>
            <button type="button" class="btn" @click="cards.pop()">
              Remove
            </button>
          </div>
        </template>
      </Carousel>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        One item for each view — dots from `activeIndex` and `scrollTo`
      </h2>
      <p class="text-sm opacity-70">
        `:repeat="false"`: `hasPrev` and `hasNext` disable the buttons at the two ends.
      </p>
      <Carousel :repeat="false" :initial-index="1">
        <!-- px-px: the browser scrolls by whole pixels, so an item with a width that is not a
             whole number can be half a pixel out, and the edge of the carousel cuts a border there -->
        <CarouselItem v-for="slide in slides" :key="slide" class="w-full px-px">
          <div class="card h-40">
            {{ slide }}
          </div>
        </CarouselItem>
        <template #footer="{ activeIndex, hasPrev, hasNext, prev, next, scrollTo }">
          <div class="mt-2 flex items-center justify-center gap-2">
            <button type="button" class="btn" aria-label="Previous" :disabled="!hasPrev" @click="prev()">
              ‹
            </button>
            <button
              v-for="(slide, index) in slides"
              :key="slide"
              type="button"
              class="size-3 rounded-full border"
              :class="{ 'bg-current': index === activeIndex }"
              :aria-label="`Slide ${index + 1}`"
              :aria-current="index === activeIndex || undefined"
              @click="scrollTo(index)"
            />
            <button type="button" class="btn" aria-label="Next" :disabled="!hasNext" @click="next()">
              ›
            </button>
          </div>
        </template>
      </Carousel>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `:items-to-scroll="1"` — one item for each step
      </h2>
      <Carousel :items-to-scroll="1" items-class="gap-4 px-px scroll-px-px">
        <template #header="{ prev, next }">
          <div class="mb-2 flex justify-end gap-2">
            <button type="button" class="btn" aria-label="Previous" @click="prev()">
              ‹
            </button>
            <button type="button" class="btn" aria-label="Next" @click="next()">
              ›
            </button>
          </div>
        </template>
        <CarouselItem v-for="n in 8" :key="n" class="card w-40">
          Card {{ n }}
        </CarouselItem>
      </Carousel>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `:autoplay="2000"` — one item every two seconds
      </h2>
      <p class="text-sm opacity-70">
        The carousel stops while the mouse is over it.
      </p>
      <Carousel :autoplay="2000">
        <CarouselItem v-for="slide in slides" :key="slide" class="w-full px-px">
          <div class="card h-24">
            {{ slide }}
          </div>
        </CarouselItem>
      </Carousel>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Links in the items — a drag does not activate them
      </h2>
      <p class="text-sm opacity-70">
        Clicks: {{ clicks }}. A press that does not move is a click.
      </p>
      <Carousel items-class="gap-4 px-px scroll-px-px">
        <CarouselItem v-for="n in 8" :key="n" class="w-40">
          <a href="#" class="card block" @click.prevent="clicks++">Link {{ n }}</a>
        </CarouselItem>
      </Carousel>
    </section>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-radius: 0.5rem;
  padding: 1.5rem 0.75rem;
  user-select: none;
}

.btn {
  border-width: 1px;
  border-radius: 0.25rem;
  padding: 0.125rem 0.625rem;
}

.btn:disabled {
  opacity: 0.4;
}
</style>
