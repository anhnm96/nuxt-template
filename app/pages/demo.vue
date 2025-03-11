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

// Handle button clicks
function handleClick() {
  iconState.value = (iconState.value + 1) % 3 // Cycle to next icon
}

const loading = ref(false)
async function asyncClick() {
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 1500)).finally(() => loading.value = false)
}

const { copy, copied } = useClipboard()
const { show } = useToast()
watch(copied, (value) => {
  if (value) show({ severity: 'success', description: 'Copied' })
})
</script>

<template>
  <main class="page p-4">
    <div class="grid-table with-label">
      <!-- button basic -->
      <div>
        <button class="w-full text-left" @click="copy('btn btn-primary min-w-20')">
          .btn.btn-primary
        </button>
      </div>
      <div class="flex gap-4">
        <Button class="btn-primary min-w-20" :loading @click="asyncClick">
          Primary
        </Button>
        <Button class="btn-info min-w-20" :loading="true" @click="asyncClick">
          Info
        </Button>
        <Button class="btn-success min-w-20" :loading @click="asyncClick">
          Info
        </Button>
        <Button class="btn-warn min-w-20" :loading @click="asyncClick">
          Warn
        </Button>
        <Button class="btn-error min-w-20" :loading @click="asyncClick">
          Error
        </Button>
        <Button class="btn-error min-w-20" aria-disabled="true" :loading @click="asyncClick">
          Error
        </Button>
      </div>
      <!-- button icon -->
      <div>
        <button class="w-full text-left" @click="copy('btn btn-icon btn-primary')">
          .btn.btn-icon.btn-primary
        </button>
      </div>
      <div class="mt-4 flex gap-4">
        <Button class="btn-primary btn-icon" :loading @click="asyncClick">
          <Icon name="ph:magnifying-glass" />
        </Button>
        <Button class="btn-icon btn-info" :loading @click="asyncClick">
          <Icon name="ph:magnifying-glass" />
        </Button>
        <Button class="btn-icon btn-success" :loading @click="asyncClick">
          <Icon name="ph:magnifying-glass" />
        </Button>
        <Button class="btn-icon btn-warn" :loading @click="asyncClick">
          <Icon name="ph:magnifying-glass" />
        </Button>
        <Button class="btn-icon btn-error" :loading @click="asyncClick">
          <Icon name="ph:magnifying-glass" />
        </Button>
        <Button class="btn-icon btn-error" disabled :loading @click="asyncClick">
          <Icon name="ph:magnifying-glass" />
        </Button>
      </div>
      <!-- button outline -->
      <div class="flex-col justify-center">
        <button class="w-full text-left" @click="copy('btn btn-outline min-w-20')">
          .btn.btn-outline
        </button>
        <button class="w-full text-left" @click="copy('btn btn-outline-primary min-w-20')">
          .btn.btn-outline-primary
        </button>
      </div>
      <div class="mt-4 flex gap-4">
        <button class="btn btn-outline min-w-20">
          Basic
        </button>
        <button loading class="btn btn-outline-primary min-w-20">
          Primary
        </button>
        <button class="btn btn-outline-info min-w-20">
          Info
        </button>
        <button class="btn btn-outline-success min-w-20">
          Info
        </button>
        <button class="btn btn-outline-warn min-w-20">
          Warn
        </button>
        <button class="btn btn-outline-error min-w-20">
          Error
        </button>
        <button class="btn btn-outline-error min-w-20" disabled>
          Error
        </button>
      </div>
      <!-- button icon outline -->
      <div class="flex-col justify-center">
        <button class="w-full text-left" @click="copy('btn btn-icon btn-outline')">
          .btn.btn-icon.btn-outline
        </button>
        <button class="w-full text-left" @click="copy('btn btn-icon btn-outline-primary')">
          .btn.btn-icon.btn-outline-primary
        </button>
      </div>
      <div class="flex gap-4">
        <button class="btn btn-icon btn-outline">
          <Icon name="ph:arrow-clockwise-bold" />
        </button>
        <button class="btn btn-icon btn-outline-primary">
          <Icon name="ph:arrow-clockwise-bold" />
        </button>
        <button class="btn btn-icon btn-outline-success">
          <Icon name="ph:arrow-clockwise-bold" />
        </button>
        <button class="btn btn-icon btn-outline-warn">
          <Icon name="ph:arrow-clockwise-bold" />
        </button>
        <button class="btn btn-icon btn-outline-error">
          <Icon name="ph:arrow-clockwise-bold" />
        </button>
      </div>
      <!-- button link -->
      <div>
        <button class="w-full text-left" @click="copy('btn btn-link text-sky-500')">
          .btn.btn-link.text-sky-500
        </button>
      </div>
      <div class="flex gap-4">
        <button class="btn btn-link min-w-20">
          Primary
        </button>
        <button class="btn btn-link min-w-20 text-sky-500">
          Info
        </button>
      </div>
      <!-- button text -->
      <div class="flex-col justify-center">
        <button class="w-full text-left" @click="copy('btn btn-text min-w-20')">
          .btn.btn-text
        </button>
        <button class="w-full text-left" @click="copy('btn btn-text-primary min-w-20')">
          .btn.btn-text-primary
        </button>
      </div>
      <div class="flex gap-4">
        <button class="btn btn-text min-w-20">
          Basic
        </button>
        <button class="btn btn-text-primary min-w-20">
          Primary
        </button>
        <button class="btn btn-text-primary min-w-20 gap-2 !px-4">
          <span>Primary</span>
          <Icon name="file-icons:microsoft-excel" class="text-lg" />
        </button>
        <button class="btn btn-text-primary min-w-20 gap-2 !px-4" disabled>
          <span>Primary</span>
          <Icon name="file-icons:microsoft-excel" class="text-lg" />
        </button>
        <button class="btn btn-text-info min-w-20">
          Info
        </button>
        <button class="btn btn-text-success min-w-20">
          Success
        </button>
        <button class="btn btn-text-warn min-w-20">
          Warn
        </button>
        <button class="btn btn-text-error min-w-20">
          Error
        </button>
      </div>
      <!-- button text icon -->
      <div class="flex-col justify-center">
        <button class="w-full text-left" @click="copy('btn btn-icon btn-text !rounded-full !p-3')">
          btn.btn-icon.btn-text
        </button>
        <button class="w-full text-left" @click="copy('btn btn-icon btn-text-primary !rounded-full !p-3')">
          btn.btn-icon.btn-text-primary
        </button>
      </div>
      <div class="mt-4 flex gap-4">
        <button class="btn btn-icon btn-text !rounded-full !p-3">
          <Icon name="ph:x-bold" />
        </button>
        <button class="btn btn-icon btn-text-primary !rounded-full !p-3">
          <Icon name="ph:check-bold" />
        </button>
        <button class="btn btn-icon btn-text-info !rounded-full !p-3">
          <Icon name="ph:check-bold" />
        </button>
        <button class="btn btn-icon btn-text-success !rounded-full !p-3">
          <Icon name="ph:check-bold" />
        </button>
        <button class="btn btn-icon btn-text-warn !rounded-full !p-3">
          <Icon name="ph:heart-bold" />
        </button>
        <button class="btn btn-icon btn-text-error !rounded-full !p-3">
          <Icon name="ph:heart-bold" />
        </button>
      </div>
    </div>
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
</style>
