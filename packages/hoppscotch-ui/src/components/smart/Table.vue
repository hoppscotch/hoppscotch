<template>
  <div class="overflow-auto rounded-md border border-dividerDark shadow-md">
    <table class="w-full">
      <thead class="bg-primaryLight">
        <tr
          class="text-secondary border-b border-dividerDark text-sm text-left"
        >
          <th v-for="title in headings" scope="col" class="px-6 py-3">
            {{ title }}
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-divider">
        <tr
          v-for="(item, rowIndex) in list"
          :key="rowIndex"
          class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
          :class="yBorder ? 'divide-x divide-divider' : ''"
        >
          <td
            v-for="(data, colIndex) in item"
            :key="colIndex"
            @click="$emit('goToDetails', item)"
            class="max-w-40"
            :class="cellStyles"
          >
            <!-- Custom implementation of the particular column -->
            <div class="flex items-center">
              <div v-if="modifyColNames?.includes(colIndex.toString())">
                <slot :name="colIndex.toString()" :item="item"></slot>
              </div>

              <!-- Generic implementation of the column -->
              <div v-else class="flex flex-col truncate text-center">
                <span v-if="data" class="truncate">
                  {{ data }}
                </span>
                <span v-else class=""> - </span>
              </div>
            </div>
          </td>

          <slot name="action" :item="item"></slot>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup generic="Item extends Record<string, unknown>">
defineProps<{
  /** Whether to show the vertical border between columns */
  yBorder?: boolean
  /**  The list of items to be displayed in the table */
  list: Item[]
  /** The headings of the table */
  headings: string[]
  /** The styles to be applied to the table cells */
  cellStyles?: string
  /** The names of the columns which have to modified using slots */
  modifyColNames?: string[]
}>()

defineEmits<{
  (event: "goToDetails", item: Item): void
}>()
</script>
