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
        <h3 class="ml-4 heading">{{ $t("shortcuts") }}</h3>
        <div class="flex">
          <ButtonSecondary to="/settings" icon="tune" />
          <ButtonSecondary icon="close" @click.native="close()" />
        </div>
      </div>
      <!-- <div class="search-wrapper">
        <input
          v-model="filterText"
          type="search"
          class="bg-primaryLight border-b border-dividerLight flex font-semibold font-mono w-full py-2 pr-2 pl-8 truncate focus:outline-none"
          :placeholder="$t('search')"
        />
      </div> -->
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
          <h5 class="font-bold text-secondaryDark text-sm">
            {{ map.section }}
          </h5>
          <div
            v-for="(shortcut, shortcutIndex) in map.shortcuts"
            :key="`map-${mapIndex}-shortcut-${shortcutIndex}`"
            class="flex items-center"
          >
            <span class="flex flex-1 text-secondaryLight mr-4">
              {{ shortcut.label }}
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
import {
  getPlatformSpecialKey,
  getPlatformAlternateKey,
} from "~/helpers/platformutils"

export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      filterText: "",
      mappings: [
        {
          section: "General",
          shortcuts: [
            {
              keys: [getPlatformSpecialKey(), "G"],
              label: this.$t("shortcut.send_request"),
            },
            {
              keys: [getPlatformSpecialKey(), "S"],
              label: this.$t("shortcut.save_to_collections"),
            },
            {
              keys: [getPlatformSpecialKey(), "K"],
              label: this.$t("shortcut.copy_request_link"),
            },
            {
              keys: [getPlatformSpecialKey(), "I"],
              label: this.$t("shortcut.reset_request"),
            },
          ],
        },
        {
          section: "Request",
          shortcuts: [
            {
              keys: [getPlatformAlternateKey(), "↑"],
              label: this.$t("shortcut.next_method"),
            },
            {
              keys: [getPlatformAlternateKey(), "↓"],
              label: this.$t("shortcut.previous_method"),
            },
            {
              keys: [getPlatformAlternateKey(), "G"],
              label: this.$t("shortcut.get_method"),
            },
            {
              keys: [getPlatformAlternateKey(), "H"],
              label: this.$t("shortcut.head_method"),
            },
            {
              keys: [getPlatformAlternateKey(), "P"],
              label: this.$t("shortcut.post_method"),
            },
            {
              keys: [getPlatformAlternateKey(), "U"],
              label: this.$t("shortcut.put_method"),
            },
            {
              keys: [getPlatformAlternateKey(), "X"],
              label: this.$t("shortcut.delete_method"),
            },
          ],
        },
      ],
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
