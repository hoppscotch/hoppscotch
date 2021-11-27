<template>
  <SmartModal
    v-if="show"
    max-width="sm:max-w-md"
    full-width
    @close="$emit('hide-modal')"
  >
    <template #body>
      <input
        id="command"
        v-model="search"
        v-focus
        type="text"
        autocomplete="off"
        name="command"
        :placeholder="`${t('app.type_a_command_search')}`"
        class="border-dividerLight text-secondaryDark flex flex-shrink-0 p-6 text-base bg-transparent border-b"
      />
      <AppFuse
        v-if="search && show"
        :input="fuse"
        :search="search"
        @action="runAction"
      />
      <div
        v-else
        class="divide-dividerLight hide-scrollbar flex flex-col flex-1 space-y-4 overflow-auto divide-y"
      >
        <div
          v-for="(map, mapIndex) in mappings"
          :key="`map-${mapIndex}`"
          class="flex flex-col"
        >
          <h5 class="text-secondaryLight px-6 py-2 my-2">
            {{ t(map.section) }}
          </h5>
          <AppPowerSearchEntry
            v-for="(shortcut, shortcutIndex) in map.shortcuts"
            :key="`map-${mapIndex}-shortcut-${shortcutIndex}`"
            :shortcut="shortcut"
            :active="shortcutsItems.indexOf(shortcut) === selectedEntry"
            @action="runAction"
            @mouseover.native="selectedEntry = shortcutsItems.indexOf(shortcut)"
          />
        </div>
      </div>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "@nuxtjs/composition-api"
import { HoppAction, invokeAction } from "~/helpers/actions"
import { spotlight as mappings, fuse } from "~/helpers/shortcuts"
import { useArrowKeysNavigation } from "~/helpers/powerSearchNavigation"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const search = ref("")

const hideModal = () => {
  search.value = ""
  emit("hide-modal")
}

const runAction = (command: HoppAction) => {
  invokeAction(command)
  hideModal()
}

const shortcutsItems = computed(() =>
  mappings.reduce(
    (shortcuts, section) => [...shortcuts, ...section.shortcuts],
    []
  )
)

const { bindArrowKeysListerners, unbindArrowKeysListerners, selectedEntry } =
  useArrowKeysNavigation(shortcutsItems, {
    onEnter: runAction,
  })

watch(
  () => props.show,
  (show) => {
    if (show) bindArrowKeysListerners()
    else unbindArrowKeysListerners()
  }
)
</script>
