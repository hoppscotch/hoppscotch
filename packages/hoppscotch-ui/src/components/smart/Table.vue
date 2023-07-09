<template>
  <div class="overflow-auto rounded-md border border-dividerDark shadow-md m-5">
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
          :class="xBorder ? 'divide-x divide-divider' : ''"
        >
          <td
            v-for="(data, colIndex) in item"
            :key="colIndex"
            @click="$emit('goToDetails', item)"
            class="max-w-40"
            :class="cellStyles"
          >
            <div class="flex items-center">
              <!-- Column with Badge -->
              <div
                v-if="
                  colIndex.toString() === badgeColName &&
                  badgeRowIndex.includes(rowIndex)
                "
              >
                <div class="flex flex-col truncate">
                  <span v-if="data" class="mt-1 truncate whitespace-normal">
                    {{ data }}
                  </span>

                  <span
                    class="text-xs font-medium px-3 py-1 my-1 rounded-full bg-green-900 text-green-300 w-min"
                  >
                    {{ badgeName }}
                  </span>
                </div>
              </div>

              <!-- Column with Subtitles -->
              <div
                v-else-if="subtitleColumns.includes(colIndex.toString())"
                class="flex flex-col truncate"
              >
                <span v-if="data" class="truncate">
                  {{ data }}
                </span>
                <span v-else> - </span>

                <div v-for="item in subtitles">
                  <div
                    v-if="item.colName === colIndex.toString()"
                    class="text-gray-400 text-tiny"
                  >
                    <span>
                      <span>
                        {{ itemSubtitle(item.subtitle, rowIndex) }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Column with no subtitle or badge -->
              <div v-else class="flex flex-col truncate">
                <span v-if="data" class="truncate">
                  {{ data }}
                </span>
                <span v-else> - </span>
              </div>
            </div>
          </td>

          <slot name="action" :item="item"></slot>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue"

const props = defineProps<{
  xBorder: boolean
  list: Record<string, unknown>[]
  headings: string[]
  cellStyles: string
  badgeName: string
  badgeRowIndex: (number | undefined)[]
  badgeColName: string
  subtitles: [
    {
      colName: string
      subtitle: string | string[]
    }
  ]
}>()

defineEmits<{
  (event: "goToDetails", uid: string): void
}>()

// Returns all the columns that needs to have a subtitle
const subtitleColumns = computed(() =>
  props.subtitles ? props.subtitles.map((item) => item.colName) : []
)

// Returns the subtitle for the given column and row
const itemSubtitle = (subtitle: string | string[], rowIndex: number) =>
  typeof subtitle === "object" ? subtitle[rowIndex] : subtitle
</script>

<style scoped>
.tippy-box[data-theme~="popover"] .tippy-content {
  padding: 0;
}
</style>
