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
        <h3 class="ml-2 heading">{{ $t("shortcuts") }}</h3>
        <div>
          <ButtonSecondary to="/settings" icon="tune" />
          <ButtonSecondary icon="close" @click.native="close()" />
        </div>
      </div>
      <div class="search-wrapper">
        <input
          v-model="filterText"
          type="search"
          class="
            bg-primaryLight
            border-b border-dividerLight
            flex
            font-semibold font-mono
            w-full
            py-2
            pr-2
            pl-8
            focus:outline-none
            truncate
          "
          :placeholder="$t('search')"
        />
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
          class="space-y-4 p-4"
        >
          <h5 class="font-bold text-secondaryDark text-base">
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
              class="bg-dividerLight rounded ml-1 py-1 px-2 inline-flex"
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
import { getPlatformSpecialKey } from "~/helpers/platformutils"

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
              keys: [this.getSpecialKey(), "G"],
              label: this.$t("send_request"),
            },
            {
              keys: [this.getSpecialKey(), "S"],
              label: this.$t("save_to_collections"),
            },
            {
              keys: [this.getSpecialKey(), "K"],
              label: this.$t("copy_request_link"),
            },
            {
              keys: [this.getSpecialKey(), "I"],
              label: this.$t("reset_request"),
            },
          ],
        },
        {
          section: "Request",
          shortcuts: [
            {
              keys: ["Alt", "↑"],
              label: this.$t("select_next_method"),
            },
            {
              keys: ["Alt", "↓"],
              label: this.$t("select_previous_method"),
            },
            {
              keys: ["Alt", "G"],
              label: this.$t("select_get_method"),
            },
            {
              keys: ["Alt", "H"],
              label: this.$t("select_head_method"),
            },
            {
              keys: ["Alt", "P"],
              label: this.$t("select_post_method"),
            },
            {
              keys: ["Alt", "U"],
              label: this.$t("select_put_method"),
            },
            {
              keys: ["Alt", "X"],
              label: this.$t("select_delete_method"),
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
    getSpecialKey: getPlatformSpecialKey,
    close() {
      this.$emit("close")
    },
  },
}
</script>
