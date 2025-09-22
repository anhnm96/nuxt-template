<script setup lang="ts">
import type { ConfirmDialogProps } from '~/components/ConfirmDialog.vue'
import dayjs from 'dayjs/esm'
import Dropdown from '~/components/Dropdown.vue'
import Tab from '~/components/tab/Tab.vue'
import TabIndicator from '~/components/tab/TabIndicator.vue'
import TabList from '~/components/tab/TabList.vue'
import TabPanel from '~/components/tab/TabPanel.vue'
import TabPanels from '~/components/tab/TabPanels.vue'
import Tabs from '~/components/tab/Tabs.vue'

const dialogStore = useDialogStore()
const { t } = useI18n()

async function handleShowAlert(severity?: Severity) {
  dialogStore.showAlert({
    description: ['This is alert message', 'This is another alert message'],
    severity,
  })
}

async function handleShowConfirm(severity?: Severity) {
  dialogStore.showConfirm({
    description: ['This is confirm message', 'This is another confirm message'],
    severity,
  })
};

async function handleShowLongMessageConfirm(options?: Partial<ConfirmDialogProps>) {
  await dialogStore.showConfirm({
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

const searchForm = reactive({
  startDate: dayjs().add(-6, 'day').startOf('day').toDate(),
  endDate: dayjs().endOf('day').toDate(),
})
</script>

<template>
  <main class="page p-4 pt-0">
    <TheHeader />
    <div class="flex items-center gap-4 py-2">
      <Avatar src="https://github.com/benjamincanac.png" class="status size-10" />
      <Avatar src="https://github.com/benjamincanac.png" class="status" />
      <Avatar text="AD" class="status inset-ring-2 ring-highlight after:top-auto after:bottom-0 after:bg-error" />
      <Avatar>
        <Icon name="ph:user" />
      </Avatar>
      <Avatar text="+99" />
      <Avatar alt="John Doe" />
    </div>
    <div>
      <Dropdown>
        <button class="btn btn-primary">
          Dropdown
        </button>
        <template #popover>
          <div>
            asdasdasfasfgas
          </div>
        </template>
      </Dropdown>
      <button class="btn btn-primary">
        Btn 1
        <Tooltip class="tooltip-dark">
          Btn1
        </Tooltip>
      </button>
      <button class="btn btn-primary">
        Btn 2
        <Tooltip class="tooltip-dark" placement="bottom" attach-to="body">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolorem, facilis!
        </Tooltip>
      </button>
    </div>
    <DateRangePicker
      v-model:start-date="searchForm.startDate"
      v-model:end-date="searchForm.endDate"
      show-unlimited-checkbox
    />
    <div>{{ searchForm }}</div>
    <div class="flex gap-4">
      <!-- horizontal border indicator -->
      <Tabs class="flex-1" value="1">
        <div class="border-b border-abd py-2">
          <TabList class="flex gap-2">
            <TabIndicator class="!-bottom-2" />
            <Tab value="1">
              Tab 1
            </Tab>
            <Tab value="2">
              Tab 2
            </Tab>
            <Tab value="3">
              Tab 3
            </Tab>
          </TabList>
        </div>
        <TabPanels keep-alive>
          <TabPanel value="1">
            Tab 1 content
          </TabPanel>
          Dummy1
          <TabPanel value="2">
            Tab 2 content
          </TabPanel>
          <div>Dummy2</div>
          <TabPanel value="3">
            Tab 3 content
          </TabPanel>
        </TabPanels>
      </Tabs>
      <!-- horizontal item indicator -->
      <Tabs class="flex-1" value="1">
        <div class="border-b border-abd py-2">
          <TabList class="flex gap-2">
            <TabIndicator class="h-full rounded-xl bg-primary/10" />
            <Tab class="rounded-xl" value="1">
              Tab 1
            </Tab>
            <Tab class="rounded-xl" value="2">
              Tab 2
            </Tab>
            <Tab class="rounded-xl" value="3">
              Tab 3
            </Tab>
          </TabList>
        </div>
        <TabPanels keep-alive>
          <TabPanel value="1">
            Tab 1 content
          </TabPanel>
          Dummy1
          <TabPanel value="2">
            Tab 2 content
          </TabPanel>
          <div>Dummy2</div>
          <TabPanel value="3">
            Tab 3 content
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
    <div class="flex gap-4">
      <!-- vertical border indicator -->
      <Tabs value="1" vertical class="flex flex-1 rounded-lg border border-abd">
        <TabList class="flex flex-col justify-center gap-1 border-r border-abd">
          <TabIndicator class="left-auto !w-0.5" />
          <Tab value="1">
            Tab 1
          </Tab>
          <Tab value="2">
            Tab 2
          </Tab>
          <Tab value="3">
            Tab 3
          </Tab>
        </TabList>
        <TabPanels keep-alive class="flex-grow p-4">
          <TabPanel value="1">
            Tab 1 content
          </TabPanel>
          Dummy1
          <TabPanel value="2">
            Tab 2 content
          </TabPanel>
          <div>Dummy2</div>
          <TabPanel value="3">
            Tab 3 content
          </TabPanel>
        </TabPanels>
      </Tabs>
      <!-- vertical item indicator -->
      <Tabs value="1" vertical class="flex flex-1 rounded-lg border border-abd">
        <div class="border-r border-abd p-2">
          <TabList class="flex flex-col gap-1">
            <TabIndicator :duration="0" class="bg-primary/10" />
            <Tab value="1">
              Tab 1
            </Tab>
            <Tab value="2">
              Tab 2
            </Tab>
            <Tab value="3">
              Tab 3
            </Tab>
          </TabList>
        </div>
        <TabPanels keep-alive class="flex-grow p-4">
          <TabPanel value="1">
            Tab 1 content
          </TabPanel>
          Dummy1
          <TabPanel value="2">
            Tab 2 content
          </TabPanel>
          <div>Dummy2</div>
          <TabPanel value="3">
            Tab 3 content
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
    <div class="grid-table with-label">
      <!-- button basic -->
      <div>
        <button class="w-full text-left" @click="copy('btn btn-primary min-w-20')">
          .btn.btn-primary
          <Tooltip
            :delay="0" attach-to="body"
            class="rounded-md bg-gray-700 px-2 py-1 text-xs text-white"
          >
            Copied!
          </Tooltip>
        </button>
      </div>
      <div class="place-content-center">
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
      </div>
      <!-- button icon -->
      <div>
        <button class="w-full text-left" @click="copy('btn btn-icon btn-primary')">
          .btn.btn-icon.btn-primary
        </button>
      </div>
      <div class="place-content-center">
        <div class="flex gap-4">
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
      <div class="place-content-center">
        <div class="flex gap-4">
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
      <div class="place-content-center">
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
      </div>
      <!-- button link -->
      <div>
        <button class="w-full text-left" @click="copy('btn btn-link text-sky-500')">
          .btn.btn-link.text-sky-500
        </button>
      </div>
      <div class="place-content-center">
        <div class="flex gap-4">
          <button class="btn btn-link min-w-20">
            Primary
          </button>
          <button class="btn btn-link min-w-20 text-sky-500">
            Info
          </button>
        </div>
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
      <div class="place-content-center">
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
      <div class="place-content-center">
        <div class="flex gap-4">
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
    </div>
    <h1 class="text-4 mb-4 text-lg font-semibold">
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
            <span v-if="iconState === 0" class="absolute top-1/2  left-1/2 size-[80px] -translate-x-1/2 -translate-y-1/2 text-[50px]">🙄</span>
            <span v-else-if="iconState === 1" class="absolute top-1/2  left-1/2 size-[80px] -translate-x-1/2 -translate-y-1/2 text-[50px]">🤗</span>
            <span v-else class="absolute top-1/2  left-1/2 size-[80px] -translate-x-1/2 -translate-y-1/2 text-[50px]">🥲</span>
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
