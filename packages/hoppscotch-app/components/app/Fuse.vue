<template>
  <div key="outputHash">
    <AppPowerSearchEntry
      v-for="(shortcut, shortcutIndex) in searchResults"
      :key="`shortcut-${shortcutIndex}`"
      :ref="`item-${shortcutIndex}`"
      :shortcut="shortcut.item"
      @action="$emit('action', shortcut.item.action)"
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
import { computed } from "@nuxtjs/composition-api"
import Fuse from "fuse.js"

const props = defineProps<{
  input: Record<string, any>[]
  search: string
}>()

const options = {
  keys: ["keys", "label", "action", "tags"],
}

const fuse = new Fuse(props.input, options)

const searchResults = computed(() => fuse.search(props.search))
</script>
