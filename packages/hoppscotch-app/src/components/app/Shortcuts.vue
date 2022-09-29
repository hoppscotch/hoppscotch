<template>
  <AppSlideOver :show="show" @close="close()">
    <template #content>
      <div class="sticky top-0 z-10 flex flex-col bg-primary">
        <div
          class="flex items-center justify-between p-2 border-b border-dividerLight"
        >
          <h3 class="ml-4 heading">{{ t("app.shortcuts") }}</h3>
          <ButtonSecondary :icon="IconX" @click="close()" />
        </div>
        <div class="flex flex-col px-6 py-4 border-b border-dividerLight">
          <input
            v-model="filterText"
            type="search"
            autocomplete="off"
            class="flex px-4 py-2 border rounded bg-primaryContrast border-dividerLight focus-visible:border-divider"
            :placeholder="`${t('action.search')}`"
          />
        </div>
      </div>
      <div v-if="filterText" class="flex flex-col divide-y divide-dividerLight">
        <div
          v-for="(map, mapIndex) in searchResults"
          :key="`map-${mapIndex}`"
          class="px-6 py-4 space-y-4"
        >
          <h1 class="font-semibold text-secondaryDark">
            {{ t(map.item.section) }}
          </h1>
          <AppShortcutsEntry
            v-for="(shortcut, index) in map.item.shortcuts"
            :key="`shortcut-${index}`"
            :shortcut="shortcut"
          />
        </div>
        <div
          v-if="searchResults.length === 0"
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
          <span class="my-2 text-center">
            {{ t("state.nothing_found") }} "{{ filterText }}"
          </span>
        </div>
      </div>
      <div v-else class="flex flex-col divide-y divide-dividerLight">
        <div
          v-for="(map, mapIndex) in mappings"
          :key="`map-${mapIndex}`"
          class="px-6 py-4 space-y-4"
        >
          <h1 class="font-semibold text-secondaryDark">
            {{ t(map.section) }}
          </h1>
          <AppShortcutsEntry
            v-for="(shortcut, shortcutIndex) in map.shortcuts"
            :key="`map-${mapIndex}-shortcut-${shortcutIndex}`"
            :shortcut="shortcut"
          />
        </div>
      </div>
    </template>
  </AppSlideOver>
</template>

<script setup lang="ts">
import IconX from "~icons/lucide/x"
import { computed, ref } from "vue"
import Fuse from "fuse.js"
import mappings from "~/helpers/shortcuts"
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  show: boolean
}>()

const options = {
  keys: ["shortcuts.label"],
}

const fuse = new Fuse(mappings, options)

const filterText = ref("")

const searchResults = computed(() => fuse.search(filterText.value))

const emit = defineEmits<{
  (e: "close"): void
}>()

const close = () => {
  filterText.value = ""
  emit("close")
}
</script>
