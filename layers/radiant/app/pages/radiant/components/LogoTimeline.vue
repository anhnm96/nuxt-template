<script setup lang="ts">
import Mark from './Mark.vue'

const [DefineRow, Row] = createReusableTemplate()
const [DefineLogo, Logo] = createReusableTemplate<{
  src: string
  label: string
}>()
</script>

<template>
  <DefineRow>
    <div class="group relative">
      <div class="absolute inset-x-0 top-1/2 h-0.5 bg-linear-to-r from-white/15 from-[2px] to-[2px] bg-size-[12px_100%]" />
      <div class="absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-white/5 from-[2px] to-[2px] bg-size-[12px_100%] group-last:hidden" />
      <slot />
    </div>
  </DefineRow>
  <DefineLogo v-slot="{ src, label }">
    <div
      class="absolute top-2 grid grid-cols-[1rem_1fr] items-center gap-2 rounded-full bg-linear-to-t from-gray-800 from-50% to-gray-700 px-3 py-1 whitespace-nowrap ring-1 ring-white/10 [--move-x-from:-100%] [--move-x-to:calc(100%+100cqw)] [animation-iteration-count:infinite] [animation-name:move-x] [animation-play-state:paused] [animation-timing-function:linear] ring-inset group-hover:[animation-play-state:running]"
    >
      <Icon :name="src" class="size-4" />
      <span class="text-sm/6 font-medium text-white">{{ label }}</span>
    </div>
  </DefineLogo>
  <div aria-hidden="true" class="relative h-full overflow-hidden">
    <div class="absolute inset-0 top-8 z-10 flex items-center justify-center">
      <div
        class="mark-wrapper absolute inset-0 backdrop-blur-md"
      />
      <div class="relative flex size-24 items-center justify-center rounded-xl bg-linear-to-t from-white/5 to-white/25 shadow-sm ring-1 ring-white/10 outline outline-offset-[-5px] outline-white/5 ring-inset">
        <Mark class="h-9 fill-white" />
      </div>
    </div>
    <div class="@container absolute inset-0 grid grid-cols-1 pt-8">
      <Row>
        <Logo
          label="Loom"
          src="logos:loom-icon"
          class="[animation-delay:-26s] [animation-duration:30s]"
        />
        <Logo
          label="Gmail"
          src="skill-icons:gmail-dark"
          class="[animation-delay:-8s] [animation-duration:30s]"
        />
      </Row>
      <Row>
        <Logo
          label="Asana"
          src="logos:asana-icon"
          class="[animation-delay:-40s] [animation-duration:40s]"
        />
        <Logo
          label="Microsoft Teams"
          src="logos:microsoft-teams"
          class="[animation-delay:-20s] [animation-duration:40s]"
        />
      </Row>
      <Row>
        <Logo
          label="Google Calendar"
          src="logos:google-calendar"
          class="[animation-delay:-10s] [animation-duration:40s]"
        />
        <Logo
          label="Google Drive"
          src="logos:google-drive"
          class="[animation-delay:-32s] [animation-duration:40s]"
        />
      </Row>
      <Row>
        <Logo
          label="Basecamp"
          src="cib:basecamp"
          class="[animation-delay:-45s] [animation-duration:45s]"
        />
        <Logo
          label="Discord"
          src="skill-icons:discord"
          class="[animation-delay:-23s] [animation-duration:45s]"
        />
      </Row>
      <Row>
        <Logo
          label="Hubspot"
          src="cib:hubspot"
          class="[animation-delay:-55s] [animation-duration:60s]"
        />
        <Logo
          label="Slack"
          src="logos:slack-icon"
          class="[animation-delay:-20s] [animation-duration:60s]"
        />
      </Row>
      <Row>
        <Logo
          label="Adobe Creative Cloud"
          src="cib:adobe-creative-cloud"
          class="[animation-delay:-9s] [animation-duration:40s]"
        />
        <Logo
          label="Zoom"
          src="logos:zoom-icon"
          class="[animation-delay:-28s] [animation-duration:40s]"
        />
      </Row>
    </div>
  </div>
</template>

<style>
.mark-wrapper {
  mask-image: url('data:image/svg+xml,<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" rx="12" fill="black"/></svg>');
  mask-position: center;
  mask-repeat: no-repeat;
}
</style>
