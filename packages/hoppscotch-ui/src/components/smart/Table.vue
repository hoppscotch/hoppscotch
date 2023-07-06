<template>
  <div
    class="overflow-hidden rounded-md border border-dividerDark shadow-md m-5"
  >
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
          :key="item.id"
          class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
          :class="xBorder ? 'divide-x divide-divider' : ''"
        >
          <td
            v-for="(data, colIndex) in item"
            :key="colIndex"
            @click="$emit('goToDetails', item)"
            class="max-w-40"
            :class="padding"
          >
            <div class="flex items-center">
              <!-- Column with Badge -->
              <div
                v-if="
                  colIndex.toString() === badgeColName &&
                  badgeRowIndex.includes(rowIndex)
                "
              >
                <div class="flex flex-col">
                  {{ data }}
                  <span
                    class="text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
                  >
                    {{ badgeName }}
                  </span>
                </div>
              </div>
              <!-- Column with Subtitles -->
              <div
                v-else-if="colIndex.toString() === subtitleColName"
                class="flex flex-col"
              >
                <div>
                  {{ data }}
                  <div class="text-gray-400 text-tiny">
                    {{ subtitle[rowIndex] }}
                  </div>
                </div>
              </div>
              <div v-else class="flex flex-col">{{ data }}</div>
            </div>
          </td>

          <slot name="action" :item="item"></slot>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  xBorder: Boolean
  list: []
  headings: []
  padding: string
  itemStyle: string
  badgeName: string
  badgeRowIndex: (number | undefined)[]
  badgeColName: string
  subtitleColName: string
  subtitle: []
}>()

defineEmits<{
  (event: "goToDetails", uid: string): void
  (event: "id", uid: string): void
}>()
</script>

<style scoped>
.tippy-box[data-theme~="popover"] .tippy-content {
  padding: 0;
}
</style>
