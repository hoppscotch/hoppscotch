<template>
  <SmartModal v-if="show" full-width @close="$emit('hide-modal')">
    <template #body>
      <input
        id="command"
        v-model="search"
        v-focus
        type="text"
        name="command"
        :placeholder="$t('app.type_a_command_search')"
        class="
          bg-transparent
          border-b border-dividerLight
          flex flex-shrink-0
          text-secondaryDark text-base
          leading-normal
          py-4
          px-6
        "
      />
      <AppLunr
        v-if="search"
        log
        :input="lunr"
        :search="search"
        @action="runAction"
      />
      <div
        v-else
        class="
          divide-y divide-dividerLight
          flex flex-col
          space-y-4
          flex-1
          overflow-auto
          hide-scrollbar
        "
      >
        <div v-for="(map, mapIndex) in mappings" :key="`map-${mapIndex}`">
          <h5 class="my-2 text-secondaryLight py-2 px-6">
            {{ $t(map.section) }}
          </h5>
          <div
            v-for="(shortcut, shortcutIndex) in map.shortcuts"
            :key="`map-${mapIndex}-shortcut-${shortcutIndex}`"
            class="
              cursor-pointer
              flex
              py-2
              px-6
              transition
              items-center
              group
              hover:bg-primaryLight
            "
            @click="runAction(shortcut.action)"
          >
            <SmartIcon
              class="
                mr-4
                opacity-75
                transition
                svg-icons
                group-hover:opacity-100
              "
              :name="shortcut.icon"
            />
            <span
              class="flex flex-1 mr-4 transition group-hover:text-secondaryDark"
            >
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
  </SmartModal>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { invokeAction } from "~/helpers/actions"
import { spotlight, lunr } from "~/helpers/shortcuts"

export default defineComponent({
  props: {
    show: Boolean,
  },
  data() {
    return {
      search: "",
      mappings: spotlight,
      lunr,
    }
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    runAction(command) {
      invokeAction(command, "path_from_invokeAction")
      this.search = ""
      this.hideModal()
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
