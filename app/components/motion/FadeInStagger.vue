<template>
  <Motion
    initial="hidden"
    while-in-view="visible"
    :transition="{ staggerChildren: 0.2 }"
    :in-view-options="{ once: true, margin: '0px 0px -200px' }"
  >
    <slot />
  </Motion>
</template>
