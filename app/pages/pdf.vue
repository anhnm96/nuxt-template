<script lang="ts" setup>
import FileUpload from '~/components/FileUpload.vue'
import ExportPdfDialog from '~/components/pdf/ExportPdfDialog.vue'
import PreviewPdfDialog from '~/components/pdf/﻿PreviewPdfDialog.vue'

const dialogStore = useDialogStore()
function handleShowExportPdfDialog() {
  dialogStore.showDialog({
    component: markRaw(ExportPdfDialog),
    props: {
      selector: '.pdf-content',
    },
  })
}

const pdfUrl = ref()

async function handleShowPreviewPdfDialog(data: FileList) {
  pdfUrl.value = URL.createObjectURL(data.item(0) as File)
  await dialogStore.showDialog({
    component: markRaw(PreviewPdfDialog),
    props: {
      pdfUrl: pdfUrl.value,
      pt: {
        panel: { class: '!m-0 w-full max-h-dvh' },
      },
    },
  })
  URL.revokeObjectURL(pdfUrl.value)
}
</script>

<template>
  <main class="page p-4">
    <h1 class="mb-4 text-base font-bold">
      Demo export PDF
    </h1>
    <div class="flex gap-4">
      <button class="btn btn-primary" @click="handleShowExportPdfDialog">
        Export PDF file
      </button>
      <FileUpload
        :accepted-file-types="['application/pdf']"
        label="Select PDF file"
        @change="handleShowPreviewPdfDialog"
      />
    </div>
    <div class="pdf-content">
      <div class="flex flex-col p-4">
        <h2 class="flex items-center gap-1 text-xl font-bold text-primary">
          <Icon name="ph:file-text" />
          <span>Page 1</span>
        </h2>
        <p>Page 1 content</p>
        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Omnis esse, accusamus fuga explicabo quam ratione debitis dicta non consequatur est maiores aliquid modi error, unde magni et architecto, qui soluta laborum dolor deserunt recusandae optio. Aliquid commodi tempore quae! Iusto quis quae eius iure aut, adipisci inventore iste autem aliquid numquam, quidem deserunt non ut quaerat? Natus reiciendis explicabo aut expedita praesentium corrupti quisquam, architecto eaque distinctio quis dolorem sint, similique dolor ullam nobis ab quo consequatur ipsam velit magni. Hic minima ducimus consequuntur quasi quos maiores tempora, eaque sequi suscipit accusamus, rerum earum incidunt a delectus. Eligendi modi, fugiat in minima illo deleniti doloremque cupiditate harum veniam deserunt minus ut, vitae odio voluptatum beatae dicta! Autem, facilis. Tempore repellendus ea rem, distinctio deserunt eos inventore fugit dolorum. Aut quis expedita nihil, accusamus vel doloribus beatae sed quas cumque! In delectus consectetur dolores! Obcaecati saepe nobis eaque ad, hic voluptas error cumque animi, sunt placeat laudantium quasi inventore ea, voluptates nulla odio rerum optio nihil sit soluta perspiciatis! Voluptatem mollitia, eius saepe velit accusantium dolore dolorem eos obcaecati quam vitae facere ducimus corporis consequatur officiis. Itaque delectus nisi totam sunt soluta quo vitae quaerat ullam, quidem magnam voluptatem labore sequi!</p>
        <div class="mt-2 flex h-50 justify-center">
          <img class="h-full" src="https://images.unsplash.com/photo-1726333629906-9a52575d4b78?q=80&w=500&auto=format&fit=crop">
        </div>
        <div class="flex justify-center">
          <a
            class="text-primary underline"
            target="_blank"
            href="https://images.unsplash.com/photo-1726333629906-9a52575d4b78?q=80&w=500&auto=format&fit=crop"
          >Image URL</a>
        </div>
      </div>
      <div class="break-before-page p-4">
        <h2 class="flex items-center gap-1 text-xl font-bold text-primary">
          <Icon name="ph:file-text" />
          <span>Page 2</span>
        </h2>
        <p>Page 2 content</p>
        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Deserunt magni officia possimus quod omnis vel exercitationem quia nulla voluptas quam quibusdam quos, quis ipsum! Obcaecati, repellendus voluptas id pariatur a, exercitationem consectetur iste animi sint in nobis! Fugiat soluta earum nisi magni ad optio vel repellat delectus corrupti omnis commodi ducimus unde minus aspernatur itaque eos error, dolorum iste! Iusto nobis mollitia velit doloribus sequi ullam vel, optio recusandae consequatur dicta vero quasi. Atque nihil mollitia nesciunt sit voluptatum inventore dicta temporibus. Cum ullam asperiores distinctio recusandae repellat harum, mollitia, totam quam nihil, sint earum tempora perferendis! Neque dicta eveniet quibusdam, ullam quo est suscipit dolore ipsum, cupiditate animi quos fugit itaque soluta. Beatae sequi laboriosam at totam temporibus labore est enim excepturi placeat non, debitis eum sunt consequatur saepe delectus! Rem, ut qui. Natus et voluptatum necessitatibus accusantium dolorum tempora velit, molestiae omnis debitis enim aut repellat commodi minus tenetur dolorem, eum ea error cumque eligendi. Minus sit tempore fugiat facilis unde rerum adipisci! Unde est suscipit vel deserunt totam nesciunt, excepturi nemo ipsam harum culpa repellat omnis velit molestias aliquam. Saepe, minus magni possimus dolorem quos placeat quis iste commodi vitae et! Tempora facilis sapiente alias praesentium provident.</p>
      </div>
    </div>
  </main>
</template>
