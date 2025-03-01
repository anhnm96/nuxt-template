export const useCategories = defineQuery(() => {
  return useQuery({
    key: () => ['categories'],
    query: () => $fetch<Categories[]>('https://dummyjson.com/products/categories'),
  })
})
