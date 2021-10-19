<template>
  <div key="outputHash">
    <AppPowerSearchEntry
      v-for="(shortcut, shortcutIndex) in searchResults"
      :key="`shortcut-${shortcutIndex}`"
      :ref="`item-${shortcutIndex}`"
      :active="shortcutIndex === selectedEntry"
      :shortcut="shortcut.item"
      @action="$emit('action', shortcut.item.action)"
      @mouseover.native="selectedEntry = shortcutIndex"
    />
    <div
      v-if="searchResults.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">manage_search</i>
      <span class="text-center">
        {{ $t("state.nothing_found") }} "{{ search }}"
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, onMounted } from "@nuxtjs/composition-api"
import Fuse from "fuse.js"
import { useArrowKeysNavigation } from "~/helpers/powerSearchNavigation"
import { HoppAction } from "~/helpers/actions"

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
  searchResults.value.map((searchResult: any) => searchResult.item)
)

const emitSearchAction = (action: HoppAction) => emit("action", action)

const { bindArrowKeysListerners, unbindArrowKeysListerners, selectedEntry } =
  useArrowKeysNavigation(searchResultsItems, {
    onEnter: emitSearchAction,
    stopPropagation: true,
  })

onMounted(bindArrowKeysListerners)

onUnmounted(unbindArrowKeysListerners)
</script>
