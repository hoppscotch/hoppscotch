<template>
  <AppSlideOver :show="show" @close="close()">
    <template #content>
      <div
        class="
          bg-primary
          border-dividerLight
          sticky
          top-0
          z-10
          flex
          items-center
          justify-between
          p-2
          border-b
        "
      >
        <h3 class="ml-4 heading">{{ t("app.shortcuts") }}</h3>
        <div class="flex">
          <ButtonSecondary svg="x" class="rounded" @click.native="close()" />
        </div>
      </div>
      <div class="border-b bg-primary border-dividerLight">
        <div class="flex flex-col mx-6 my-4">
          <input
            v-model="filterText"
            type="search"
            autocomplete="off"
            class="
              bg-primaryLight
              border-dividerLight
              focus-visible:border-divider
              flex
              w-full
              px-4
              py-2
              border
              rounded
            "
            :placeholder="`${t('action.search')}`"
          />
        </div>
      </div>
      <div
        v-if="filterText"
        class="
          flex flex-col
          divide-dividerLight
          hide-scrollbar
          flex-1
          overflow-auto
          divide-y
        "
      >
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
          class="
            flex
            text-secondaryLight
            flex-col
            items-center
            justify-center
            p-4
          "
        >
          <i class="pb-2 opacity-75 material-icons">manage_search</i>
          <span class="text-center">
            {{ t("state.nothing_found") }} "{{ filterText }}"
          </span>
        </div>
      </div>
      <div
        v-else
        class="
          flex flex-col
          divide-dividerLight
          hide-scrollbar
          flex-1
          overflow-auto
          divide-y
        "
      >
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

<style lang="scss" scoped>
.shortcut-key {
  @apply bg-dividerLight;
  @apply rounded;
  @apply ml-2;
  @apply py-1;
  @apply px-2;
  @apply inline-flex;
}
</style>
