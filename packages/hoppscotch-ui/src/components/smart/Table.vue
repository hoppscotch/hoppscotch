<template>
  <div class="overflow-auto rounded-sm border border-dividerDark shadow-md m-5">
    <table class="w-full">
      <thead class="bg-primaryLight">
        <tr
          class="text-secondary border-b border-dividerDark text-sm text-left"
          :class="headingStyles"
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
            class="max-w-56 px-6 py-2"
            :class="cellStyle(colIndex.toString(), rowIndex)"
          >
            <div class="flex items-center">
              <!-- Column with Badge -->
              <div
                v-if="
                  colIndex.toString() === badgeColName &&
                  badgeRowIndices?.includes(rowIndex)
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

<script lang="ts" setup generic="Item extends Record<string, unknown>">
import { computed } from "vue"

const props = defineProps<{
  /** Whether to show the vertical border between columns */
  yBorder?: boolean
  /**  The list of items to be displayed in the table */
  list: Item[]
  /** The headings of the table */
  headings: string[]

  /** The styles to be applied to the table headings*/
  headingStyles?: string

  /** The styles to be applied to the table cells */
  cellStyles?:
    | string
    | Array<{
        /** The name of the column that needs to have a style */
        colName: string

        rowIndex: number
        /** The style to be applied to the column */
        style: string
      }>

  /** The name of the badge */
  badgeName?: string
  /** The indices of the rows that needs to have a badge */
  badgeRowIndices?: (number | undefined)[]
  /** The index of the column that needs to have a badge */
  badgeColName?: string
  /** The subtitles to be displayed for the columns */
  subtitles?: Array<{
    /** The name of the column that needs to have a subtitle */
    colName: string
    /** The subtitle to be displayed for the column */
    subtitle: string | string[]
  }>
}>()

defineEmits<{
  (event: "goToDetails", item: Item): void
}>()

// Returns all the columns that needs to have a subtitle
const subtitleColumns = computed(() =>
  props.subtitles ? props.subtitles.map((item) => item.colName) : []
)

// Returns the subtitle for the given column and row
const itemSubtitle = (subtitle: string | string[], rowIndex: number) =>
  typeof subtitle === "object" ? subtitle[rowIndex] : subtitle

const cellStyle = (colName: string, rowIndex: number) => {
  if (typeof props.cellStyles === "string") return props.cellStyles
  const style = props.cellStyles?.find(
    (item) => item.colName === colName && item.rowIndex === rowIndex
  )?.style

  return style ? style : ""
}
</script>
