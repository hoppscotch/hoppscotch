<template>
  <div v-if="showResponse" class="flex flex-1 flex-col">
    <!-- Toolbar -->
    <div
      class="sticky top-lowerSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      :class="{ 'py-2': !responseBodyText }"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div class="flex items-center">
        <!-- Search Input -->
        <div v-if="isTabularData" class="mr-2 flex items-center">
          <input
            v-model="searchText"
            type="text"
            :placeholder="t('action.search')"
            class="rounded border border-divider bg-primaryLight px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <!-- Download as CSV -->
        <HoppButtonSecondary
          v-if="isTabularData"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          :icon="IconDownload"
          @click="downloadAsCSV"
        />
        <!-- Copy as CSV -->
        <HoppButtonSecondary
          v-if="isTabularData"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :icon="copyIcon"
          @click="copyAsCSV"
        />
        <!-- Save as Example -->
        <HoppButtonSecondary
          v-if="showResponse && !isEditable"
          v-tippy="{ theme: 'tooltip' }"
          :title="
            isSavable
              ? `${t('action.save_as_example')} <kbd>${getSpecialKey()}</kbd><kbd>E</kbd>`
              : t('response.please_save_request')
          "
          :icon="IconSave"
          :class="{
            'cursor-not-allowed select-none opacity-75': !isSavable,
          }"
          @click="isSavable ? saveAsExample() : null"
        />
      </div>
    </div>

    <!-- Table or Fallback Message -->
    <div
      ref="containerRef"
      class="relative flex h-full flex-1 flex-col overflow-auto"
    >
      <div
        v-if="!isTabularData"
        class="flex flex-col items-center justify-center p-8 text-center"
      >
        <icon-lucide-info class="mb-4 h-12 w-12 text-accent" />
        <h3 class="mb-2 text-lg font-semibold text-secondaryDark">
          {{ t("response.table_not_available") }}
        </h3>
        <p class="mb-4 text-secondary">
          {{ t("response.table_not_available_description") }}
        </p>
        <HoppButtonSecondary
          :label="t('response.view_json')"
          outline
          @click="switchToJSONLens"
        />
      </div>

      <!-- Table View -->
      <div v-else class="overflow-auto">
        <table class="w-full border-collapse">
          <thead
            class="sticky top-0 z-10 border-b border-dividerLight bg-primary"
          >
            <tr>
              <th
                v-for="column in table.getAllColumns()"
                :key="column.id"
                class="cursor-pointer border-r border-dividerLight px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondaryDark transition hover:bg-primaryLight"
                @click="column.getToggleSortingHandler()?.($event)"
              >
                <div class="flex items-center justify-between">
                  <span>{{ column.id }}</span>
                  <div class="ml-2">
                    <icon-lucide-arrow-up
                      v-if="column.getIsSorted() === 'asc'"
                      class="h-4 w-4 text-accent"
                    />
                    <icon-lucide-arrow-down
                      v-else-if="column.getIsSorted() === 'desc'"
                      class="h-4 w-4 text-accent"
                    />
                    <icon-lucide-arrow-up-down
                      v-else
                      class="h-4 w-4 text-secondaryLight"
                    />
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="border-b border-dividerLight transition hover:bg-primaryLight"
            >
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="border-r border-dividerLight px-4 py-3 text-sm text-secondary"
              >
                <div class="max-w-md overflow-hidden text-ellipsis">
                  {{ formatCellValue(cell.getValue()) }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination Info -->
        <div
          v-if="tableData.length > 0"
          class="sticky bottom-0 flex items-center justify-between border-t border-dividerLight bg-primary px-4 py-3 text-sm text-secondaryLight"
        >
          <div>
            {{
              t("response.table_showing_rows", {
                count: table.getRowModel().rows.length,
                total: tableData.length,
              })
            }}
          </div>
          <div v-if="searchText">
            {{ t("response.table_filtered_info") }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "@composables/i18n"
import { useResponseBody } from "@composables/lens-actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppRESTRequestResponse } from "@hoppscotch/data"
import { isTabularJSONResponse } from "~/helpers/lenses/tableLens"
import IconDownload from "~icons/lucide/download"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconSave from "~icons/lucide/save"
import {
  useVueTable,
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type Updater,
} from "@tanstack/vue-table"

const t = useI18n()
const props = defineProps<{
  response: HoppRESTResponse | HoppRESTRequestResponse
  isSavable: boolean
  isEditable: boolean
  tabId: string
  selectedLensTab?: string
}>()
const emit = defineEmits<{
  (e: "save-as-example"): void
  (e: "switch-lens", lensId: string): void
}>()
const containerRef = ref<HTMLElement | null>(null)
const searchText = ref("")
const copyIcon = ref(IconCopy)
const sorting = ref<SortingState>([])
const showResponse = computed(() => {
  if ("type" in props.response) {
    return props.response.type === "success" || props.response.type === "fail"
  }
  return "body" in props.response
})
const { responseBodyText } = useResponseBody(props.response)
// Check if the response is tabular data (array of objects)
const isTabularData = computed(() => {
  if (!responseBodyText.value) return false
  return isTabularJSONResponse(responseBodyText.value)
})
// Parse the JSON data
const parsedData = computed(() => {
  if (!isTabularData.value) return []
  try {
    return JSON.parse(responseBodyText.value)
  } catch {
    return []
  }
})
// Generate columns from the first object's keys
const columns = computed<ColumnDef<any>[]>(() => {
  if (parsedData.value.length === 0) return []
  const firstItem = parsedData.value[0]
  const keys = Object.keys(firstItem)
  const columnHelper = createColumnHelper<any>()
  return keys.map((key) =>
    columnHelper.accessor(key, {
      header: key,
      cell: (info) => info.getValue(),
      enableSorting: true,
    })
  )
})
// Filter data based on search text
const tableData = computed(() => {
  if (!searchText.value) return parsedData.value
  const search = searchText.value.toLowerCase()
  return parsedData.value.filter((row: any) => {
    return Object.values(row).some((value) => {
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(search)
    })
  })
})
// Create the table instance
const table = useVueTable({
  get data() {
    return tableData.value
  },
  get columns() {
    return columns.value
  },
  state: {
    get sorting() {
      return sorting.value
    },
  },
  onSortingChange: (updaterOrValue: Updater<SortingState>) => {
    sorting.value =
      typeof updaterOrValue === "function"
        ? updaterOrValue(sorting.value)
        : updaterOrValue
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
})
// Format cell values for display
const formatCellValue = (value: any): string => {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
// Convert table data to CSV
const convertToCSV = (): string => {
  if (tableData.value.length === 0) return ""
  const headers = Object.keys(tableData.value[0])
  const csvHeaders = headers.join(",")
  const csvRows = tableData.value.map((row: any) => {
    return headers
      .map((header) => {
        const value = row[header]
        const stringValue = formatCellValue(value)
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      .join(",")
  })
  return [csvHeaders, ...csvRows].join("\n")
}
// Download as CSV
const downloadAsCSV = () => {
  const csv = convertToCSV()
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  const responseName = computed(() => {
    if ("type" in props.response) {
      if (props.response.type === "success") {
        return props.response.req.name
      }
      return "Untitled"
    }
    return (props.response as HoppRESTRequestResponse).name
  })
  link.download = `${responseName.value}-table.csv`
  link.click()
  URL.revokeObjectURL(url)
}
// Copy as CSV to clipboard
const copyAsCSV = async () => {
  const csv = convertToCSV()
  try {
    await navigator.clipboard.writeText(csv)
    copyIcon.value = IconCheck
    setTimeout(() => {
      copyIcon.value = IconCopy
    }, 1000)
  } catch (error) {
    console.error("Failed to copy:", error)
  }
}
// Save as example
const saveAsExample = () => {
  emit("save-as-example")
}
// Switch to JSON lens
const switchToJSONLens = () => {
  emit("switch-lens", "json")
}
</script>

<style scoped>
/* Additional custom styles if needed */
table {
  font-variant-numeric: tabular-nums;
}

th {
  user-select: none;
}

td {
  word-break: break-word;
}
</style>
