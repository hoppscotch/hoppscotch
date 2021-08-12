<template>
  <SmartModal v-if="show" placement="top" @close="$emit('hide-modal')">
    <template #body>
      <input
        id="command"
        v-model="search"
        v-focus
        type="text"
        name="command"
        :placeholder="$t('app.type_a_command_search')"
        class="
          bg-primary
          border-b border-dividerLight
          text-secondaryDark text-base
          leading-normal
          px-4
          pt-2
          pb-6
          truncate
          focus:outline-none
        "
      />
      <div
        class="
          divide-y divide-dividerLight
          flex flex-col
          space-y-4
          flex-1
          overflow-auto
          hide-scrollbar
        "
      >
        <div
          v-for="(map, mapIndex) in filteredMappings"
          :key="`map-${mapIndex}`"
        >
          <h5 class="font-normal my-2 text-secondaryLight py-2 px-4">
            {{ map.section }}
          </h5>
          <div
            v-for="(shortcut, shortcutIndex) in map.shortcuts"
            :key="`map-${mapIndex}-shortcut-${shortcutIndex}`"
            class="
              rounded
              cursor-pointer
              flex
              py-2
              px-4
              transition
              items-center
              group
              hover:bg-primaryLight
            "
            @click="
              runAction(shortcut.action)
              hideModal()
            "
          >
            <i class="mr-4 opacity-75 material-icons group-hover:opacity-100">
              {{ shortcut.icon }}
            </i>
            <span class="flex flex-1 mr-4 group-hover:text-secondaryDark">
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
import { invokeAction } from "~/helpers/actions"
import { spotlight } from "~/helpers/shortcuts"

export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      search: "",
      mappings: spotlight,
    }
  },
  computed: {
    filteredMappings() {
      return this.mappings.filter((mapping) =>
        mapping.shortcuts.some((shortcut) =>
          shortcut.keywords.some((keyword) =>
            keyword.toLowerCase().includes(this.search.toLowerCase())
          )
        )
      )
    },
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    runAction(command) {
      invokeAction(command, "path_from_invokeAction")
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
