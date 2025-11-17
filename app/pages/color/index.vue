<script setup lang="ts">
import ColorPicker from '~/components/color/ColorPicker.vue'
import ColorPickerField from '~/components/color/ColorPickerField.vue'

const basicColor0 = ref()
const basicColor1 = ref('#3e9757')
const disabledColor = ref('#dc2828')
const colorPT = ref('#76b0d9')

const colorField = ref()
const colorFieldDisabled = ref('#960000')
const colorFieldPT = ref('#ef8e8e')

const content = ref(`
  <p>I\'m running Tiptap with Vue.js. 🎉</p>
  <p>“I have been suffering from Typomania all my life, a sickness that is incurable but not lethal.”</p>
        <p>— Erik Spiekermann, December 2008</p>
  `)

const isDisabled = ref(false)
const { $api } = useNuxtApp()
const toast = useToast()

async function uploadImage(file: File, setPercentage: (value: number) => void) {
  const formData = new FormData()
  formData.append('file', file)

  const data = await $api<ApiResponse<{ url: string }>>(
    '/v1.0/file-upload',
    {
      baseURL: 'https://tisy-mock-server.onrender.com',
      method: 'POST',
      body: formData,
      convertRequestToSnakeKey: false,
      onUploadProgress: (progressEvent) => {
        const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100)

        setPercentage(percentComplete)
      },
      onResponseError(error) {
        toast.show({
          severity: 'error',
          description: error.response.statusText,
        })
      },
    },
  )

  return data?.url
}

const image = shallowRef(null)
const imageDimensions = shallowRef({
  width: 0,
  height: 0,
})
const editImage = useTemplateRef('editImage')

function handleChange(files: FileList) {
  const file = files.item(0) as File
  if (file && file.type.startsWith('image/')) {
    editImage.value.loadImage(file)
  }
}
</script>

<template>
  <main class="page p-4">
    <FileUpload
      :upload-image="uploadImage"
      :accept="['image/*']"
      :max-size="1024 * 1024 * 5"
      @change="handleChange"
    />
    <EditImage ref="editImage" />
    <!-- <Tiptap v-model="content" :disabled="isDisabled" :upload-image /> -->
    <div class="tiptap mt-4">
      <div v-html="content" />
    </div>
    <button class="btn btn-primary mt-4" @click="isDisabled = !isDisabled">
      Disable {{ isDisabled ? 'ON' : 'OFF' }}
    </button>
    <!-- RadioButton -->
    <h1 class="text-4 mb-4 font-bold">
      ColorPicker
    </h1>

    <!-- Basic -->
    <div class="mt-4 flex flex-col gap-2">
      <Label>Basic</Label>
      <div class="flex flex-col gap-1">
        <ColorPicker v-model="basicColor0" />
        <span>
          Hex Color: {{ basicColor0 }}
        </span>
      </div>
    </div>
    <div class="mt-4">
      <div class="flex flex-col gap-1">
        <ColorPicker v-model="basicColor1" />
        <span>
          Hex Color: {{ basicColor1 }}
        </span>
      </div>
    </div>

    <!-- Disabled -->
    <div class="mt-4 flex flex-col gap-2">
      <Label>Disabled</Label>
      <div class="flex flex-col gap-1">
        <ColorPicker v-model="disabledColor" :disabled="true" />
        <span>
          Hex Color: {{ disabledColor }}
        </span>
      </div>
    </div>

    <!-- PT -->
    <div class="mt-4 flex flex-col gap-2">
      <Label>PT</Label>
      <div class="flex flex-col gap-1">
        <ColorPicker
          v-model="colorPT"
          :pt="{
            colorPreview: {
              class: 'rounded-full size-14',
            },
          }"
        />
        <span>
          Hex Color: {{ colorPT }}
        </span>
      </div>
    </div>

    <hr>

    <!-- ColorPickerField -->
    <div class="mt-4">
      <h2 class="text-4 font-bold">
        ColorPicker Field
      </h2>
    </div>
    <!-- basic -->
    <div>
      <div>Basic</div>
      <ColorPickerField
        v-model="colorField"
        :pt="{ input: { input: { class: '!w-50' } } }"
      />
    </div>
    <!-- disabled -->
    <div class="mt-4">
      <div>Disabled</div>
      <ColorPickerField
        v-model="colorFieldDisabled"
        disabled
        :pt="{ input: { input: { class: '!w-50' } } }"
      />
    </div>
    <!-- PT -->
    <div class="mt-4">
      <div>PT</div>
      <ColorPickerField
        v-model="colorFieldPT"
        :pt="{
          input: { input: { class: '!w-60 text-green-500' } },
          colorPallette: { pt: { confirmLabel: 'Apply', cancelLabel: 'Cancel' } },
        }"
      />
    </div>
  </main>
</template>
