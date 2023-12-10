<template>
  <HoppSmartSlideOver :show="show" :title="t('app.shortcuts')" @close="close()">
    <template #content>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 flex-col overflow-x-auto bg-primary"
      >
        <HoppSmartInput
          v-model="filterText"
          type="search"
          styles="px-6 py-4 border-b border-dividerLight"
          :placeholder="`${t('action.search')}`"
          input-styles="flex px-4 py-2 border rounded bg-primaryContrast border-divider hover:border-dividerDark focus-visible:border-dividerDark"
        />
      </div>
      <div class="flex flex-col divide-y divide-dividerLight">
        <HoppSmartPlaceholder
          v-if="isEmpty(shortcutsResults)"
          :text="`${t('state.nothing_found')} ‟${filterText}”`"
        >
          <template #icon>
            <icon-lucide-search class="svg-icons opacity-75" />
          </template>
        </HoppSmartPlaceholder>
        <details
          v-for="(sectionResults, sectionTitle) in shortcutsResults"
          v-else
          :key="`section-${sectionTitle}`"
          class="flex flex-col"
          open
        >
          <summary
            class="flex min-w-0 flex-1 cursor-pointer items-center px-6 py-4 font-semibold text-secondaryLight transition hover:text-secondaryDark focus:outline-none"
          >
            <icon-lucide-chevron-right class="indicator mr-2" />
            <span
              class="capitalize-first truncate font-semibold text-secondaryDark"
            >
              {{ sectionTitle }}
            </span>
          </summary>
          <div class="flex flex-col space-y-2 px-6 pb-4">
            <AppShortcutsEntry
              v-for="(shortcut, index) in sectionResults"
              :key="`shortcut-${index}`"
              :shortcut="shortcut"
            />
          </div>
        </details>
      </div>
    </template>
  </HoppSmartSlideOver>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, ref } from "vue"
import { ShortcutDef, getShortcuts } from "~/helpers/shortcuts"
import MiniSearch from "minisearch"
import { useI18n } from "@composables/i18n"
import { groupBy, isEmpty } from "lodash-es"

const t = useI18n()

defineProps<{
  show: boolean
}>()

const minisearch = new MiniSearch({
  fields: ["label", "keys", "section"],
  idField: "label",
  storeFields: ["label", "keys", "section"],
  searchOptions: {
    fuzzy: true,
    prefix: true,
  },
})

const shortcuts = getShortcuts(t)

onBeforeMount(() => {
  minisearch.addAllAsync(shortcuts)
})

const filterText = ref("")

const shortcutsResults = computed(() => {
  // If there are no search text, return all the shortcuts
  const results =
    filterText.value.length > 0
      ? minisearch.search(filterText.value)
      : shortcuts

  return groupBy(results, "section") as Record<string, ShortcutDef[]>
})

const emit = defineEmits<{
  (e: "close"): void
}>()

const close = () => {
  filterText.value = ""
  emit("close")
}
</script>
