<template>
  <SmartModal v-if="show" full-width @close="$emit('hide-modal')">
    <template #body>
      <input
        id="command"
        v-model="search"
        v-focus
        type="text"
        autocomplete="off"
        name="command"
        :placeholder="$t('app.type_a_command_search')"
        class="
          bg-transparent
          border-b border-dividerLight
          flex flex-shrink-0
          text-secondaryDark text-base
          p-6
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
          <AppSearchEntry
            v-for="(shortcut, shortcutIndex) in map.shortcuts"
            :key="`map-${mapIndex}-shortcut-${shortcutIndex}`"
            :shortcut="shortcut"
            @action="runAction"
          />
        </div>
      </div>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { HoppAction, invokeAction } from "~/helpers/actions"
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
      this.search = ""
      this.$emit("hide-modal")
    },
    runAction(command: HoppAction) {
      invokeAction(command)
      this.hideModal()
    },
  },
})
</script>
