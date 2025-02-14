<script lang="ts">
export const PAGE_NAME = 'REPORT_HELP_MANAGEMENT_LIST'
</script>

<script lang="ts" setup>
definePageMeta({
  name: PAGE_NAME,
})

interface Product {
  id: number
  title: string
  description: string
  category: string
  price: string
  meta: {
    createdAt: string
    updatedAt: string
  }
}
const currentPage = ref(1)
const PER_PAGE = 10
const { data, isLoading } = useQuery<{ products: Product[], total: number }>({
  key: () => ['posts', { page: currentPage.value }],
  query: () => $fetch('https://dummyjson.com/products', {
    query: { limit: PER_PAGE, skip: PER_PAGE * currentPage.value },
  }),
})

const headers = ['title', 'description', 'category', 'price', 'createdAt']

const { selectedItems, isAllSelected, toggleSelectAll, isItemChecked, selectItem, hasSelectedItem }
  = useCheckbox(computed(() => data.value?.products || []), i => i.id)

const dialogStore = useDialogStore()
async function handleRemoveItem() {
  const result = await dialogStore.showConfirmDialog({ title: 'Confirm', description: `Do you want to delete ${selectedItems.value?.length} items?` })
  if (!result) return

  await Promise.all(selectedItems.value.map(i => fetch(`https://dummyjson.com/products/${i}`, { method: 'DELETE' })))
}
</script>

<template>
  <div class="p-4">
    List
    <div class="border border-slate-200 rounded-md bg-slate-50">
      <Button class="px-2">
        <Icon name="ph:magnifying-glass-bold" />
      </Button>
    </div>
    <!-- actions -->
    <div class="mt-4 flex justify-between">
      <Button
        class="btn-warning" :disabled="selectedItems.length === 0"
        @click="handleRemoveItem"
      >
        <span>Delete</span>
        <Icon name="ph:trash" />
      </Button>
      <NuxtLink class="btn btn-primary" to="/register">
        <span>Register</span>
        <Icon name="ph:pencil-line" />
      </NuxtLink>
    </div>
    <!-- list edit -->
    <div class="mt-4 flex justify-between">
      <h4 class="font-medium">
        Post list
      </h4>
      <div>
        Total {{ data?.products.length }}
      </div>
    </div>
    <table class="mt-4 w-full border-collapse border border-slate-200">
      <thead>
        <tr>
          <th class="pl-6 pr-4">
            <Checkbox
              class="inline-block h-[18px] w-[18px]"
              type="checkbox"
              :indeterminate="hasSelectedItem && !isAllSelected"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
          </th>
          <th v-for="header in headers" :key="header">
            {{ header }}
          </th>
        </tr>
      </thead>
      <td v-if="isLoading" :colspan="headers.length" class="py-2">
        <Spinner class="mx-auto text-3xl text-primary" />
      </td>
      <tbody v-else-if="data">
        <tr v-for="(product, index) in data.products" :key="product.id">
          <td class="pl-6 pr-4 text-center">
            <input
              class="h-[18px] w-[18px]"
              type="checkbox"
              :checked="isItemChecked(product)"
              @click="selectItem(product, index, $event)"
            >
          </td>
          <td>{{ product.title }}</td>
          <td>
            <p class="line-clamp-2 break-all">
              {{ product.description }}
            </p>
          </td>
          <td>{{ product.category }}</td>
          <td>{{ product.price }}</td>
          <td>{{ product.meta.createdAt }}</td>
        </tr>
      </tbody>
    </table>
    <div class="mt-4 text-center">
      <Pagination
        v-if="data"
        v-model:current-page="currentPage"
        :total="data.total" :per-page="PER_PAGE"
      />
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";

table th,
table td {
  @apply border border-slate-200 p-2;
}
</style>
