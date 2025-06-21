<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { InputText, ProgressBar } from 'primevue'
import Tab from '~/components/tab/Tab.vue'
import TabIndicator from '~/components/tab/TabIndicator.vue'
import TabList from '~/components/tab/TabList.vue'
import TabPanel from '~/components/tab/TabPanel.vue'
import TabPanels from '~/components/tab/TabPanels.vue'
import Tabs from '~/components/tab/Tabs.vue'
import Dropdown from '../Dropdown.vue'
import Tooltip from '../Tooltip.vue'
// import type { FileUploadData, FileUploadErrorContext } from '../../../../types/components/field/FileUploadField';

type FileUploadData = any
type FileUploadErrorContext = any
const { editor, imageDefaultWidth = 200 } = defineProps<{
  editor?: Editor
  imageDefaultWidth?: number
}>()

const id = useId()
const { $api } = useNuxtApp()

const isUploadingImage = ref(false)
const percentage = ref(0)
const dialogStore = useDialogStore()

function handleInvalid(context: FileUploadErrorContext) {
  const errorMessage = context.errors[0]?.message || 'Invalid file'

  dialogStore.showAlert({
    description: errorMessage,
    severity: 'error',
  })
}

async function handleSubmit(fileUploadData: FileUploadData, toggleShow: (value?: boolean) => void) {
  isUploadingImage.value = true
  percentage.value = 0
  const formData = new FormData()

  formData.append('file', fileUploadData.file)

  const { url } = await $api<ApiResponse<{ url: string }>>(
    '/v1.0/file-upload',
    {
      baseURL: 'https://tisy-mock-server.onrender.com',
      method: 'POST',
      body: formData,
      convertRequestToSnakeKey: false,
      // onUploadProgress: (progressEvent) => {
      //   const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100)

      //   percentage.value = Math.max(Math.min(percentComplete, 100), 0)
      // },
    },
  )

  if (!url) {
    percentage.value = 0
    isUploadingImage.value = false

    return
  }

  percentage.value = 100
  toggleShow(false)
  setImage(url)
  isUploadingImage.value = false
}

const imageUrl = ref('')

function setImage(src: string) {
  // @ts-expect-error type
  editor?.chain().focus().setImage({ src, style: `width: ${imageDefaultWidth}px` }).run()
  imageUrl.value = ''
}
</script>

<template>
  <Dropdown placement="bottom-start">
    <button class="btn btn-text btn-icon">
      <Icon class="text-xl" name="i-ph:image-bold" />
      <Tooltip
        position="bottom"
        :distance="8"
        class="tooltip-dark"
      >
        Insert Image
      </Tooltip>
    </button>
    <template #popover="{ toggleShow }">
      <Tabs
        value="1"
        class="w-75 border border-abd rounded-md"
      >
        <TabList class="flex">
          <TabIndicator class="h-full bg-primary/10" />
          <Tab value="1">
            <Icon class="text-xl" name="i-lucide:cloud-upload" />
          </Tab>
          <Tab value="2">
            <Icon class="text-xl" name="i-mdi:link-variant" />
          </Tab>
        </TabList>
        <TabPanels keep-alive>
          <TabPanel value="1">
            <div class="p-4">
              <FileUpload
                v-if="!isUploadingImage"
                :accepted-file-types="['image/*']"
                class="bg-abg w-full text-slate-700 border-abd grid cursor-pointer select-none place-items-center border rounded-xl border-dashed py-5 transition hover:bg-abd font-semibold"
                @invalid="handleInvalid"
                @change="handleSubmit($event, toggleShow)"
              >
                Click to upload
              </FileUpload>
              <div v-else class="flex items-center gap-4">
                <ProgressBar
                  :value="percentage"
                  :show-value="false"
                  class="mt-0.5 h-1 w-112"
                />

                {{ percentage }}%
              </div>
            </div>
          </TabPanel>
          <TabPanel value="2">
            <div class="flex flex-col gap-4 bg-white p-4">
              <!-- url -->
              <div class="flex flex-col gap-1">
                <Label :for="`image-url__${id}`">
                  URL
                </Label>
                <InputText
                  :id="`image-url__${id}`"
                  v-model="imageUrl"
                  v-focus
                  autocomplete="off"
                />
              </div>
              <button
                class="btn btn-primary"
                @click="toggleShow(false); setImage(imageUrl)"
              >
                Insert
              </button>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </Dropdown>
</template>
