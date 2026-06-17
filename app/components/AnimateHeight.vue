<template>
  <div class="grid grid-rows-[0fr] overflow-hidden transition-[grid-template-rows,opacity] duration-200 data-[open=false]:opacity-0 data-[open=true]:grid-rows-[1fr]">
    <div class="min-h-0">
      <slot />
    </div>
  </div>
</template>
