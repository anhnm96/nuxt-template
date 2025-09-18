<script setup lang="ts">
import Mark from './Mark.vue'

const [DefineCircle, Circle] = createReusableTemplate<{
  size: number
  delay: number
  opacity: string
}>()
</script>

<template>
  <DefineCircle v-slot="{ size, delay, opacity }">
    <div
      :style="{ '--opacity': opacity, '--size': `${size}px`, '--delay': `${delay}s` }" class="'absolute rounded-full', 'bg-[radial-gradient(circle,transparent_25%,color-mix(in_srgb,var(--color-blue-500)_var(--opacity),transparent)_100%)]', 'ring-1 ring-inset' top-1/2
        left-1/2
        -translate-x-1/2 -translate-y-1/2 ring-blue-500/8"
    />
  </DefineCircle>
  <div aria-hidden="true" class="wrapper relative h-full overflow-hidden">
    <!-- circles -->
    <div class="absolute inset-0">
      <Circle :size="528" opacity="3%" :delay="0.45" />
      <Circle :size="400" opacity="5%" :delay="0.3" />
      <Circle :size="272" opacity="5%" :delay="0.15" />
      <Circle :size="144" opacity="10%" :delay="0" />
      <div class="absolute inset-0 bg-linear-to-t from-white to-35%" />
    </div>
    <div class="absolute left-1/2 h-full w-104 -translate-x-1/2">
      <!-- main logo -->
      <div
        class="absolute top-32 left-44 flex size-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
      >
        <Mark class-name="h-9 fill-black" />
      </div>
      <div
        class="logo absolute flex size-16 flex-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
        :style="{ 'left': '360px', 'top': '144px', '--x': '6px', '--y': '1px', '--rotate': '5deg', '--delay': '0.38s' }"
      >
        <Icon
          size="32px"
          name="prime:twitter"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrapper:hover .logo {
  animation: shake 0.75s ease-in-out var(--delay) infinite alternate;
}

@keyframes shake {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }

  100% {
     /* transform: translate(var(--x), var(--y)) rotate(--rotate); */
     transform: translate(6px, 1px) rotate(5deg);
  }
}
</style>
