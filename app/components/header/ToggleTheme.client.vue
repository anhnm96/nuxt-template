<script setup lang="ts">
const colorMode = useColorMode()

const colorModes = [
  {
    id: 'light',
    icon: 'lucide:sun',
    ariaLabel: 'Switch to dark theme',
  },
  {
    id: 'dark',
    icon: 'lucide:moon',
    ariaLabel: 'Switch to light theme',
  },
]

const selectedMode = computed(() => colorModes.find(mode => mode.id === colorMode.value))
</script>

<template>
  <SwapButton
    v-slot="state"
    :selected="selectedMode"
    :states="colorModes"
    class="text-primary shadow-none hover:bg-elevated"
    @change="toggleColorMode($event.event, () => colorMode.preference = $event.value.id)"
  >
    <SwapItem v-bind="{ ...state }" size="20px" />
  </SwapButton>
</template>
