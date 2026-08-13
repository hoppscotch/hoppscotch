<template>
  <draggable
    v-model="orderedEntries"
    item-key="id"
    animation="250"
    handle=".draggable-handle"
    ghost-class="cursor-move"
    chosen-class="bg-primaryLight"
    drag-class="cursor-grabbing"
    class="flex flex-col"
  >
    <template #item="{ element: entry }">
      <label
        class="group flex items-center gap-2 py-1.5 cursor-pointer text-secondaryDark"
      >
        <!-- Slot the request executes in; deselected rows hold none. -->
        <span
          class="w-5 flex-shrink-0 text-right text-tiny text-secondaryLight tabular-nums"
        >
          {{ runPositions.get(entry.id) ?? "–" }}
        </span>

        <!-- Not a <button>: a button here would be the label's first labelable
             descendant, stealing row clicks from the checkbox. -->
        <span
          class="draggable-handle flex flex-shrink-0 cursor-grab items-center text-secondaryLight opacity-0 group-hover:opacity-100"
          @click.prevent
        >
          <component :is="IconGripVertical" class="svg-icons" />
        </span>

        <HoppSmartCheckbox
          :on="entry.selected"
          @change="emit('toggle', [entry.id], !entry.selected)"
        />

        <!-- Folders collapse to icons; the full path is on the tooltip. -->
        <span
          v-if="entry.path.length"
          v-tippy="{ theme: 'tooltip' }"
          :title="entry.path.join(' / ')"
          class="flex items-center flex-shrink-0 text-secondaryLight"
        >
          <template v-for="(folder, depth) in entry.path" :key="depth">
            <component :is="IconFolder" class="svg-icons" />
            <component :is="IconChevronRight" class="svg-icons opacity-60" />
          </template>
        </span>

        <span
          class="font-bold text-tiny flex-shrink-0"
          :style="{ color: entry.methodColor }"
        >
          {{ entry.method }}
        </span>
        <span class="truncate">{{ entry.name }}</span>
      </label>
    </template>
  </draggable>

  <p v-if="orderedEntries.length === 0" class="py-2 text-secondaryLight">
    {{ t("collection_runner.no_requests_match_filter") }}
  </p>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { computed } from "vue"
import draggable from "vuedraggable-es"
import { useI18n } from "~/composables/i18n"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { getRequestSelectionID } from "~/helpers/runner/selection"
import IconChevronRight from "~icons/lucide/chevron-right"
import IconFolder from "~icons/lucide/folder"
import IconGripVertical from "~icons/lucide/grip-vertical"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    collection: HoppCollection
    selectedIDs: Set<string>
    /** Run order, as selection IDs. Empty means "natural collection order". */
    order: string[]
    filter?: string
  }>(),
  { filter: "" }
)

const emit = defineEmits<{
  (e: "toggle", ids: string[], select: boolean): void
  (e: "reorder", order: string[]): void
}>()

type Entry = {
  id: string
  name: string
  method: string
  methodColor: string
  /** Folder names from the collection root down to the request's parent. */
  path: string[]
  selected: boolean
}

const matches = (haystack: string, filter: string) =>
  filter.trim().length === 0 ||
  haystack.toLowerCase().includes(filter.trim().toLowerCase())

/**
 * Flattens the tree in the runner's walk order — folders (depth-first) before
 * a node's own requests. Must agree with `collectRequestIDs` and
 * `planCollection`.
 */
const flatten = (
  collection: HoppCollection,
  parentPath: number[],
  folderNames: string[]
): Entry[] => [
  ...collection.folders.flatMap((folder, index) =>
    flatten(folder, [...parentPath, index], [...folderNames, folder.name])
  ),
  ...collection.requests.map((request, index): Entry => {
    const path = [...parentPath, index]
    return {
      id: getRequestSelectionID(request as HoppRESTRequest, path),
      name: request.name,
      method: request.method,
      methodColor: getMethodLabelColorClassOf(request.method),
      path: folderNames,
      selected: props.selectedIDs.has(
        getRequestSelectionID(request as HoppRESTRequest, path)
      ),
    }
  }),
]

const naturalEntries = computed(() => flatten(props.collection, [], []))

/**
 * The user's explicit order first, then anything it doesn't mention in
 * natural order — a request added after an ordering still shows up.
 */
const sortedEntries = computed(() => {
  const byID = new Map(naturalEntries.value.map((entry) => [entry.id, entry]))
  const ordered = props.order
    .map((id) => byID.get(id))
    .filter((entry): entry is Entry => entry !== undefined)

  const seen = new Set(ordered.map((entry) => entry.id))
  return [...ordered, ...naturalEntries.value.filter((e) => !seen.has(e.id))]
})

// Run slot per selected entry, counted over the full (unfiltered) sorted
// list so "1" is always the first request that will actually run.
const runPositions = computed(() => {
  const positions = new Map<string, number>()
  let slot = 0
  for (const entry of sortedEntries.value) {
    if (entry.selected) positions.set(entry.id, ++slot)
  }
  return positions
})

const orderedEntries = computed<Entry[]>({
  get: () =>
    sortedEntries.value.filter((entry) =>
      matches(
        `${entry.method} ${entry.name} ${entry.path.join(" ")}`,
        props.filter
      )
    ),
  // Dragging reports the filtered list; splice it back into the full order
  // so hidden entries aren't dropped.
  set: (dragged) => {
    const visible = new Set(dragged.map((entry) => entry.id))
    const queue = dragged.map((entry) => entry.id)
    const next = sortedEntries.value.map((entry) =>
      visible.has(entry.id) ? queue.shift()! : entry.id
    )
    emit("reorder", next)
  },
})
</script>
