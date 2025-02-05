<script lang="ts" setup>
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
// eslint-disable-next-line unused-imports/no-unused-vars
const { selectedItems, isAllSelected, toggleSelectAll, isItemChecked, selectItem, hasSelectedItem }
  = useCheckbox(computed(() => data.value?.products || []))
</script>

<template>
  <div>
    List
    <div class="border border-slate-200 rounded-md bg-slate-50">
      <Button class="px-2">
        <Icon name="ph:magnifying-glass-bold" />
      </Button>
    </div>

    <table class="w-full border-collapse border border-slate-200">
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
          <td>{{ product.description }}</td>
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
