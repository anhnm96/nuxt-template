<script setup lang="ts">
import { cloneDeep } from 'lodash-es'
import { injectProductsRootContext } from '~/pages/list.vue'

const {
  initialSearchForm,
  searchForm,
  appliedSearchForm,
  isLoading: isLoadingList,
  refetch,
} = injectProductsRootContext()!
const { t } = useI18n()

interface Categories {
  name: string
  slug: string
}

const { data: categories, isLoading: isLoadingCategories } = useQuery<Categories[]>({
  key: () => ['categories'],
  query: () => $fetch('https://dummyjson.com/products/categories'),
})

const maxLength = {
  keyword: 50,
}

function submitSearchForm() {
  truncateFields(searchForm.value, maxLength)
  appliedSearchForm.value = cloneDeep(searchForm.value)
  refetch()
}

function resetSearchForm() {
  searchForm.value = cloneDeep(initialSearchForm)
  searchForm.value.service = categories.value?.[0].slug
}
</script>

<template>
  <div class="@container">
    <div class="relative flex flex-wrap gap-4 border border-slate-200 rounded-md bg-slate-50 p-4 @5xl:flex-nowrap">
      <div class="flex-grow">
        <!-- row 1 -->
        <div class="flex flex-wrap gap-4">
          <!-- game select -->
          <div class="w-50 flex flex-col gap-1">
            <Label for="select_game">
              {{ t('game_dialog.game_name') }}
            </Label>
            <Select
              v-model="searchForm.service"
              label-id="select_game"
              option-label="name"
              option-value="slug"
              :placeholder="t('game_dialog.placeholder_select')"
              :reset-filter-on-hide="false"
              :options="categories"
              :scroll-height="categories?.length ?? 0 > 6 ? '18.5rem' : '19rem'"
              :filter="(categories?.length ?? 0) > 6"
              :loading="isLoadingCategories"
            />
          </div>
          <!-- keyword search -->
          <div class="flex flex-grow flex-col gap-1">
            <Label
              for="input_keyword"
              :help-tooltip-contents="[
                '2자 미만의 검색어는 조회되지 않습니다. <br>(단, 한국어는 형태소 분석기를 통한 1글자 검색이 가능합니다.)',
                '입력한 검색단어가 너무 긴 경우 앞 20자까지의 단어로 조회됩니다.',
              ]"
            >
              {{ t('game_dialog.keyword') }}
            </Label>
            <div class="flex items-end gap-2 @5xl:flex-nowrap">
              <!-- keyword input -->
              <InputWrapper
                class="max-w-[574px] min-w-[416px] w-full"
              >
                <input
                  id="input_keyword"
                  v-model="searchForm.keyword"
                  type="text"
                  class="inputtext w-full"
                  :placeholder="t('placeholder.max_length_count', { length: maxLength.keyword })"
                  @keypress.enter="submitSearchForm"
                >
              </InputWrapper>
              <!-- characters counter -->
              <CharacterCounter :value="searchForm.keyword" :max-length="maxLength.keyword" />
            </div>
          </div>
        </div>
      </div>
      <!-- form actions -->
      <div class="flex items-center gap-4">
        <!-- refresh -->
        <button
          class="btn btn-icon btn-outline"
          @click="resetSearchForm"
        >
          <Icon name="mdi:refresh" />
        </button>
        <!-- submit -->
        <Button
          class="btn-icon btn-primary"
          :loading="isLoadingList"
          :disabled="isLoadingCategories"
          @click="submitSearchForm"
        >
          <Icon name="tabler:search" />
        </Button>
      </div>
    </div>
  </div>
</template>
