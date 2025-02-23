<template>
  <div class="flex flex-col">
    <div
      v-for="(mode, index) of modes"
      :key="`mode-${index}`"
      class="flex w-fit"
    >
      <HoppSmartRadio
        v-tippy="{ theme: 'tooltip', maxWidth: 500 }"
        :value="mode"
        :label="t(getEncodingModeName(mode))"
        :title="t(getEncodingModeTooltip(mode))"
        :selected="mode === activeMode"
        :class="'!px-0 hover:bg-transparent'"
        @change="changeMode(mode)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CollectionSearchOptions,
  CollectionSearchOption,
  applySetting,
} from "~/newstore/settings"
import { useSetting } from "@composables/settings"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const modes = CollectionSearchOptions
const activeMode = useSetting("COLLECTION_SEARCH_OPTION")
console.log("modes = ", modes)
console.log("activeMode = ", activeMode)

const changeMode = (option: CollectionSearchOption) => {
  applySetting("COLLECTION_SEARCH_OPTION", option)
}

const getEncodingModeName = (mode: string) => {
  switch (mode) {
    case "name":
      return "request.name"
    case "url":
      return "request.url"
    case "both":
      return "settings.both_title_and_url"
    default:
      return "settings.collection_search_options"
  }
}

const getEncodingModeTooltip = (mode: string) => {
  switch (mode) {
    case "name":
      return "settings.collection_search_name_tooltip"
    case "url":
      return "settings.collection_search_url_tooltip"
    case "both":
      return "settings.collection_search_both_tooltip"
    default:
      return "settings.collection_search_options"
  }
}
</script>
