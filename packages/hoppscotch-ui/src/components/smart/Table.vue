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
                v-else-if="subCol.includes(colIndex.toString())"
                class="flex flex-col"
              >
                {{ data }}
                <div v-for="item in subtitle">
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
import { computed, onMounted } from "vue"

const props = defineProps<{
  xBorder: Boolean
  list: []
  headings: []
  padding: string
  itemStyle: string
  badgeName: string
  badgeRowIndex: (number | undefined)[]
  badgeColName: string
  subtitle: [
    {
      colName: string
      subtitle: string | []
    }
  ]
}>()

defineEmits<{
  (event: "goToDetails", uid: string): void
  (event: "id", uid: string): void
}>()

const subCol = computed(() =>
  props.subtitle ? props.subtitle.map((item) => item.colName) : []
)

onMounted(() => {
  console.log(props.subtitle)
  console.log(subCol)
})

const itemSubtitle = (subtitle: string | string[], rowIndex: number) =>
  typeof subtitle === "object" ? subtitle[rowIndex] : subtitle
</script>

<style scoped>
.tippy-box[data-theme~="popover"] .tippy-content {
  padding: 0;
}
</style>
