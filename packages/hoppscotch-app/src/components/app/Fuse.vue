<template>
  <div key="outputHash" class="flex flex-col flex-1 overflow-auto">
    <div class="flex flex-col">
      <AppPowerSearchEntry
        v-for="(shortcut, shortcutIndex) in searchResults"
        :key="`shortcut-${shortcutIndex}`"
        :active="shortcutIndex === selectedEntry"
        :shortcut="shortcut.item"
        @action="emit('action', shortcut.item.action)"
        @mouseover="selectedEntry = shortcutIndex"
      />
    </div>
    <div
      v-if="searchResults.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
      <span class="my-2 text-center">
        {{ t("state.nothing_found") }} "{{ search }}"
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, onMounted } from "vue"
import Fuse from "fuse.js"
import { useArrowKeysNavigation } from "~/helpers/powerSearchNavigation"
import { HoppAction } from "~/helpers/actions"
import { useI18n } from "@composables/i18n"

const t = useI18n()

const props = defineProps<{
  input: Record<string, any>[]
  search: string
}>()

const emit = defineEmits<{
  (e: "action", action: HoppAction): void
}>()

const options = {
  keys: ["keys", "label", "action", "tags"],
}

const fuse = new Fuse(props.input, options)

const searchResults = computed(() => fuse.search(props.search))

const searchResultsItems = computed(() =>
  searchResults.value.map((searchResult) => searchResult.item)
)

const emitSearchAction = (action: HoppAction) => emit("action", action)

const { bindArrowKeysListeners, unbindArrowKeysListeners, selectedEntry } =
  useArrowKeysNavigation(searchResultsItems, {
    onEnter: emitSearchAction,
    stopPropagation: true,
  })

onMounted(() => {
  bindArrowKeysListeners()
})

onUnmounted(() => {
  unbindArrowKeysListeners()
})
</script>
