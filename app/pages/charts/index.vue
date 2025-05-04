<script setup lang="ts">
import Chart1 from './components/Chart1.vue'
import Chart2 from './components/Chart2.vue'
import Chart3 from './components/Chart3.vue'
import Chart4 from './components/Chart4.vue'
import Chart5 from './components/Chart5.vue'
import Chart6 from './components/Chart6.vue'
import Chart7 from './components/Chart7.vue'
import Chart8 from './components/Chart8.vue'
import Chart9 from './components/Chart9.vue'
import Chart10 from './components/Chart10.vue'
import Chart11 from './components/Chart11.vue'
</script>

<template>
  <div class="p-4">
    <div class="grid gap-4 grid-cols-4">
      <Chart1 class="p-4" />
      <Chart2 class="p-4" />
      <Chart3 class="p-4" />
      <Chart4 class="p-4" />
    </div>
    <div class="mt-4 grid gap-4 grid-cols-3">
      <Chart5 class="p-4" />
      <Chart6 class="p-4" />
      <Chart7 class="p-4" />
    </div>
    <div class="mt-4 grid gap-4 grid-cols-3">
      <Chart8 class="p-4" />
      <Chart9 class="p-4" />
      <Chart10 class="p-4" />
    </div>
    <div>
      <Chart11 />
    </div>
  </div>
</template>
