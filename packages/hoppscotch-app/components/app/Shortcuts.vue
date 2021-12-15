<template>
  <AppSlideOver :show="show" @close="close()">
    <template #content>
      <div class="bg-primary flex flex-col top-0 z-10 sticky">
        <div
          class="border-b border-dividerLight flex p-2 items-center justify-between"
        >
          <h3 class="ml-4 heading">{{ t("app.shortcuts") }}</h3>
          <ButtonSecondary svg="x" @click.native="close()" />
        </div>
        <div class="border-b border-dividerLight flex flex-col py-4 px-6">
          <input
            v-model="filterText"
            type="search"
            autocomplete="off"
            class="bg-primaryLight border border-dividerLight rounded flex py-2 px-4 focus-visible:border-divider"
            :placeholder="`${t('action.search')}`"
          />
        </div>
      </div>
      <div v-if="filterText" class="divide-dividerLight divide-y flex flex-col">
        <div
          v-for="(map, mapIndex) in searchResults"
          :key="`map-${mapIndex}`"
          class="space-y-4 py-4 px-6"
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
          class="flex flex-col text-secondaryLight p-4 items-center justify-center"
        >
          <i class="opacity-75 pb-2 material-icons">manage_search</i>
          <span class="my-2 text-center">
            {{ t("state.nothing_found") }} "{{ filterText }}"
          </span>
        </div>
      </div>
      <div v-else class="divide-dividerLight divide-y flex flex-col">
        <div
          v-for="(map, mapIndex) in mappings"
          :key="`map-${mapIndex}`"
          class="space-y-4 py-4 px-6"
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
import { computed, ref } from "@nuxtjs/composition-api"
import Fuse from "fuse.js"
import mappings from "~/helpers/shortcuts"
import { useI18n } from "~/helpers/utils/composables"

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
