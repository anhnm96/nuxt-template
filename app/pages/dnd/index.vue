<script setup lang="ts">
import DragImgOnDrop from './components/DragImgOnDrop.vue'
import DragList from './components/DragList.vue'
import DynamicDragImage from './components/DynamicDragImage.vue'
import InfiniteContent from './components/InfiniteContent.vue'
import OverflowContent from './components/OverflowContent.vue'
import RestrictDropable from './components/RestrictDropable.vue'
import TrelloBoard from './components/trello/TrelloBoard.vue'
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>dnd demo</div>
    <DragList />
    <div class="flex justify-center gap-8">
      <!--
        data-testid: several demos on this page share `group="infinite"`, which
        is nothing to pick one of them out by. This is the one the drop-preview
        e2e spec drives — see tests/playwright/e2e/dnd-drop-preview.spec.ts
      -->
      <div data-testid="drop-preview-demo">
        <OverflowContent class="w-100" :length="10" />
      </div>
      <OverflowContent class="w-100" />
      <InfiniteContent class="w-100" />
    </div>
    <DynamicDragImage />
    <DragImgOnDrop />
    <RestrictDropable />
    <div>nested lists: columns of cards</div>
    <TrelloBoard />
  </div>
</template>
