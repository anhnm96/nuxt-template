<script setup lang="ts">
import type { ConfirmDialogProps } from '~/components/ConfirmDialog.vue'

const dialogStore = useDialogStore()
const { t } = useI18n()

async function handleShowAlert(severity?: Severity) {
  dialogStore.showAlertDialog({
    description: ['This is alert message', 'This is another alert message'],
    severity,
  })
}

async function handleShowConfirm(severity?: Severity) {
  dialogStore.showConfirmDialog({
    description: ['This is confirm message', 'This is another confirm message'],
    severity,
  })
};

async function handleShowLongMessageConfirm(options?: Partial<ConfirmDialogProps>) {
  await dialogStore.showConfirmDialog({
    description: [
      'This is alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
      'This is another alert message This is another alert message',
    ],
    ...options,
  })
}

const iconState = ref(0) // Current visible icon index (0, 1, or 2)
let previousState: number | null = null

function updateIcons() {
  const containers = document.querySelectorAll('.icon-container')
  containers.forEach((container) => {
    const icons = container.querySelectorAll('.icon')
    icons.forEach((icon, index) => {
      // Remove all animation and state classes
      icon.classList.remove('showing', 'hiding', 'hidden')
      if (index === iconState.value) {
        icon.classList.add('showing') // Animate to visible
      } else if (index === previousState) {
        icon.classList.add('hiding') // Animate to hidden
      } else {
        icon.classList.add('hidden') // Stay hidden
      }
    })
  })
}
onMounted(() => {
  updateIcons()
})
// Handle button clicks
function handleClick() {
  previousState = iconState.value // Store current state
  iconState.value = (iconState.value + 1) % 3 // Cycle to next icon
  updateIcons() // Update animations
}
</script>

<template>
  <main class="page p-4">
    <h1 class="mb-4 text-4 font-semibold text-lg">
      Alert / Confirm / Dialog
    </h1>

    <!-- alert -->
    <div class="mt-4 flex flex-wrap gap-4">
      <Button
        label="Default Alert"
        class="btn-info"
        @click="handleShowAlert()"
      />
      <Button
        label="Success Alert"
        class="btn-success"
        @click="handleShowAlert('success')"
      />
      <Button
        label="Warn Alert"
        class="btn-warn"
        @click="handleShowAlert('warn')"
      />
      <Button
        label="Error Alert"
        class="btn-error"
        @click="handleShowAlert('error')"
      />
    </div>
    <!-- confirm -->
    <div class="mt-4 flex flex-wrap gap-4">
      <Button
        label="Default Confirm"
        class="btn-info"
        @click="handleShowConfirm()"
      />
      <Button
        label="Success Confirm"
        class="btn-success"
        @click="handleShowConfirm('success')"
      />
      <Button
        label="Warn Confirm"
        class="btn-warn"
        @click="handleShowConfirm('warn')"
      />
      <Button
        label="Error Confirm"
        class="btn-error"
        @click="handleShowConfirm('error')"
      />
    </div>
    <!-- long message confirm -->
    <div class="mt-4 flex flex-wrap gap-4">
      <Button
        label="Default Long Message Confirm"
        class="btn-info"
        @click="handleShowLongMessageConfirm({ confirmLabel: t('add'), cancelLabel: t('reject') })"
      />
      <Button
        label="Success Long Message Confirm"
        class="btn-success"
        @click="handleShowLongMessageConfirm({ severity: 'success', confirmLabel: t('register'), cancelLabel: t('reject') })"
      />
      <Button
        label="Warn Long Message Confirm"
        class="btn-warn"
        @click="handleShowLongMessageConfirm({ severity: 'warn', confirmLabel: t('update') })"
      />
      <Button
        label="Error Long Message Confirm"
        class="btn-error"
        @click="handleShowLongMessageConfirm({ severity: 'error', confirmLabel: t('delete') })"
      />
    </div>
    <!-- nested dialog -->
    <!-- <div class="mt-4 flex flex-wrap gap-4">
      <Button
        label="Nested Dialog"
        class="btn-primary"
        @click="handleShowNestedDialog()"
      />
      <Button
        label="Nested Dialog"
        class="btn-success"
        @click="handleShowNestedDialog('success')"
      />
      <Button
        label="Nested Dialog"
        class="btn-warn"
        @click="handleShowNestedDialog('warn')"
      />
      <Button
        label="Nested Dialog"
        class="btn-error"
        @click="handleShowNestedDialog('error')"
      />
    </div> -->
    <div class="flex flex-center">
      <div class="flex items-center gap-2 flex-col">
        <span class="text-sm text-muted-foreground">transition</span>
        <button class="contrast-button" @click="handleClick">
          <div class="relative size-[7rem]">
            <Transition name="swap" appear>
              <span v-if="iconState === 0" class="text-[50px] size-[80px]  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">🙄</span>
              <span v-else-if="iconState === 1" class="text-[50px] size-[80px]  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">🤗</span>
              <span v-else class="text-[50px] size-[80px]  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">🥲</span>
            </Transition>
          </div>
        </button>
      </div>
      <div class="flex items-center gap-2 flex-col">
        <span class="text-sm text-muted-foreground">with contrast</span>
        <button class="contrast-button" @click="handleClick">
          <div class="relative icon-container size-[7rem]">
            <span class="text-[50px] size-[80px] icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">🙄</span>
            <span class="text-[50px] size-[80px] icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">🤗</span>
            <span class="text-[50px] size-[80px] icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">🥲</span>
          </div>
        </button>
      </div>
      <div class="flex items-center gap-2 flex-col">
        <span class="text-sm text-muted-foreground">with contrast</span>
        <button class="contrast-button" @click="handleClick">
          <div class="relative icon-container size-[7rem]">
            <Icon mode="svg" size="80" name="lucide:menu" class="icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Icon mode="svg" size="80" name="lucide:plus" class="icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Icon mode="svg" size="80" name="lucide:user-cog" class="icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </button>
      </div>
      <div class="flex items-center gap-2 flex-col">
        <span class="text-sm text-muted-foreground">without contrast</span>
        <button class="normal-button" @click="handleClick">
          <div class="relative icon-container size-[7rem]">
            <Icon mode="svg" size="80" name="lucide:menu" class="icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Icon mode="svg" size="80" name="lucide:plus" class="icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Icon mode="svg" size="80" name="lucide:user-cog" class="icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </button>
      </div>
    </div>
  </main>
</template>

<style>
.swap-enter-from,
.swap-leave-to {
  @apply opacity-0 ;
  filter: blur(8px);
}

.swap-enter-to,
.swap-leave-from {
  @apply opacity-100;
  filter: blur(0);
}

.swap-enter-active {
 transition: opacity 150ms linear, filter 400ms linear;
}

.swap-leave-active {
  transition: opacity 150ms 250ms linear, filter 400ms linear;
}
@keyframes opacity-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes opacity-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes blur-in {
  from {
    filter: blur(8px);
  }
  to {
    filter: blur(0);
  }
}

@keyframes blur-out {
  from {
    filter: blur(0);
  }
  to {
    filter: blur(8px);
  }
}

.showing {
  animation: opacity-in 150ms linear forwards, blur-in 400ms linear forwards;
}

.hiding {
  animation: blur-out 400ms linear forwards,
    opacity-out 150ms linear 300ms forwards;
}

/* Contrast effect for the first button */
.contrast-button {
  /* the 0.2px blur is "antialiasing" */

  /* filter: contrast(200) blur(0.2px); */
}

.hidden {
  opacity: 0;
  /* filter: blur(10px); */
}
</style>
