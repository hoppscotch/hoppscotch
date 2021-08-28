<template>
  <AppSlideOver :show="show" @close="close()">
    <template #content>
      <div
        class="
          bg-primary
          border-b border-dividerLight
          flex
          p-2
          top-0
          z-10
          items-center
          sticky
          justify-between
        "
      >
        <h3 class="ml-4 heading">{{ $t("app.shortcuts") }}</h3>
        <div class="flex">
          <ButtonSecondary svg="x" class="rounded" @click.native="close()" />
        </div>
      </div>
      <div class="bg-primary border-b border-dividerLight">
        <div class="flex flex-col my-4 mx-6 search-wrapper">
          <input
            v-model="filterText"
            type="search"
            class="
              bg-primaryLight
              border border-dividerLight
              rounded
              flex
              w-full
              py-2
              pr-2
              pl-8
              focus-visible:border-divider
            "
            :placeholder="$t('action.search')"
          />
        </div>
      </div>
      <div
        class="
          divide-y divide-dividerLight
          flex flex-col flex-1
          overflow-auto
          hide-scrollbar
        "
      >
        <div
          v-for="(map, mapIndex) in mappings"
          :key="`map-${mapIndex}`"
          class="space-y-4 py-4 px-6"
        >
          <h1 class="font-semibold text-secondaryDark">
            {{ $t(map.section) }}
          </h1>
          <div
            v-for="(shortcut, shortcutIndex) in map.shortcuts"
            :key="`map-${mapIndex}-shortcut-${shortcutIndex}`"
            class="flex items-center"
          >
            <span class="flex flex-1 mr-4">
              {{ $t(shortcut.label) }}
            </span>
            <span
              v-for="(key, keyIndex) in shortcut.keys"
              :key="`map-${mapIndex}-shortcut-${shortcutIndex}-key-${keyIndex}`"
              class="shortcut-key"
            >
              {{ key }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </AppSlideOver>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import shortcuts from "~/helpers/shortcuts"

export default defineComponent({
  props: {
    show: Boolean,
  },
  data() {
    return {
      filterText: "",
      mappings: shortcuts,
    }
  },
  watch: {
    $route() {
      this.$emit("close")
    },
  },
  methods: {
    close() {
      this.$emit("close")
    },
  },
})
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
