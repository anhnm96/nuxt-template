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
    <!-- custom dialog -->
    <!-- <div class="mt-4 flex flex-wrap gap-4">
      <Button
        label="Custom Dialog"
        class="btn-primary"
        @click="handleShowDialog()"
      />
      <Button
        label="Custom Dialog"
        class="btn-success"
        @click="handleShowDialog('success')"
      />
      <Button
        label="Custom Dialog"
        class="btn-warn"
        @click="handleShowDialog('warning')"
      />
      <Button
        label="Custom Dialog"
        class="btn-error"
        @click="handleShowDialog('error')"
      />
    </div> -->
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
  </main>
</template>
