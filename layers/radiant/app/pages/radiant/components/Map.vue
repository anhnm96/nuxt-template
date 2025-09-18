<script setup lang="ts">
import marker1 from '~/assets/map/1.jpg'
import marker2 from '~/assets/map/2.jpg'
import marker3 from '~/assets/map/3.jpg'
import marker4 from '~/assets/map/4.jpg'
import marker5 from '~/assets/map/5.jpg'
import map from '~/assets/map/map.png'

const [DefineMarker, Marker] = createReusableTemplate<{
  src: string
  offset: number
  top: number
  delay: number
}>()
</script>

<template>
  <DefineMarker v-slot="{ src, offset, top, delay }">
    <div
      :style="{ '--offset': `${offset}px`, '--delay': `${delay}s`, 'top': `${top}px` }"
      class="marker absolute left-[calc(50%+var(--offset))] size-[38px] drop-shadow-[0_3px_1px_rgba(0,0,0,.15)]"
    >
      <svg fill="none" viewBox="0 0 38 38" class="absolute size-full">
        <path
          d="M29.607 5.193c5.858 5.857 5.858 15.355 0 21.213l-9.9 9.9-.707.706-.708-.708-9.899-9.898c-5.857-5.858-5.857-15.356 0-21.213 5.858-5.858 15.356-5.858 21.214 0Z"
          class="fill-black/5"
        />
        <path
          d="m28.9 25.698-9.9 9.9-9.9-9.9C3.634 20.232 3.634 11.367 9.1 5.9 14.569.432 23.433.432 28.9 5.9c5.467 5.468 5.467 14.332 0 19.8Z"
          class="fill-white"
        />
      </svg>
      <img alt="" :src class="absolute top-[4px] left-[7px] size-6 rounded-full">
    </div>
  </DefineMarker>
  <div aria-hidden="true" class="relative size-full">
    <div
      class="absolute inset-0 mask-[linear-gradient(to_bottom,black_50%,transparent)] bg-size-[530px_430px] bg-position-[center_-75px] bg-no-repeat"
      :style="{ backgroundImage: `url(${map})` }"
    />
    <div class="marker-wrapper absolute inset-0">
      <Marker :src="marker1" :top="96" :offset="-128" :delay="0.15" />
      <Marker :src="marker2" :top="160" :offset="-16" :delay="0.4" />
      <Marker :src="marker3" :top="144" :offset="96" :delay="0.3" />
      <Marker :src="marker4" :top="192" :offset="64" :delay="0.6" />
      <Marker :src="marker5" :top="224" :offset="-32" :delay="0.8" />
    </div>
  </div>
</template>

<style scoped>
/* .marker {
  opacity: 0;
  transform: translateY(-20px);
  transition-property: transform, opacity;
  transition-duration: 0.25s;
  transition-timing-function: cubic-bezier(0.25, 1.5, 0.5, 1);
  transition-delay: var(--delay);
}

.marker-wrapper:hover .marker {
  opacity: 1;
  transform: translateY(0);
} */

.marker-wrapper:not(:hover) .marker {
  animation: fade-out 0.25s ease-out var(--delay) forwards, slide-out 0.25s ease-out var(--delay) forwards;
}

.marker-wrapper:hover .marker {
  opacity: 0;
  animation: fade-in 0.25s ease-out var(--delay) forwards, slide-in 0.25s ease-out var(--delay) forwards;
}

@keyframes fade-in {
  0% {
    opacity: 0;
    transform: scale(0.75);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slide-in {
  0% {
    transform: translateY(-20px);
  }

  33% {
    transform: translateY(0);
  }

  66% {
    transform: translateY(4px);
  }

  100% {
    transform: translateY(0);
  }
}

@keyframes fade-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(0.75);
  }
}

@keyframes slide-out {
  0% {
    transform: translateY(0);
  }

  33% {
    transform: translateY(4px);
  }

  66% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(-20px);
  }
}
</style>
