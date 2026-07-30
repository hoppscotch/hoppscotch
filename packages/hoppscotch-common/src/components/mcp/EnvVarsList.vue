<template>
  <div class="flex flex-col">
    <draggable
      v-model="envVarsWithID"
      item-key="id"
      animation="250"
      handle=".draggable-handle"
      draggable=".draggable-content"
      ghost-class="cursor-move"
      chosen-class="bg-primaryLight"
      drag-class="cursor-grabbing"
    >
      <template #item="{ element: { envVar }, index }">
        <div
          class="draggable-content group flex divide-x divide-dividerLight border-b border-dividerLight"
        >
          <span>
            <HoppButtonSecondary
              v-tippy="{
                theme: 'tooltip',
                delay: [500, 20],
                content:
                  index !== envVars.length - 1
                    ? t('action.drag_to_reorder')
                    : null,
              }"
              :icon="IconGripVertical"
              class="opacity-0"
              :class="{
                'draggable-handle cursor-grab group-hover:opacity-100':
                  index !== envVars.length - 1,
              }"
              tabindex="-1"
            />
          </span>
          <input
            v-model="envVar.key"
            class="flex flex-1 bg-transparent px-4 py-2"
            :placeholder="`${t('count.variable', { count: index + 1 })} ${t('count.key')}`"
            name="key"
            type="text"
            autocomplete="off"
            @change="
              updateEnvVar(index, {
                key: ($event.target as HTMLInputElement).value,
                value: envVar.value,
                active: envVar.active,
              })
            "
          />
          <input
            v-model="envVar.value"
            class="flex flex-1 bg-transparent px-4 py-2"
            :placeholder="`${t('count.variable', { count: index + 1 })} ${t('count.value')}`"
            name="value"
            type="text"
            autocomplete="off"
            @change="
              updateEnvVar(index, {
                key: envVar.key,
                value: ($event.target as HTMLInputElement).value,
                active: envVar.active,
              })
            "
          />
          <span>
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="
                (envVar.active ?? true)
                  ? t('action.turn_off')
                  : t('action.turn_on')
              "
              :icon="(envVar.active ?? true) ? IconCheckCircle : IconCircle"
              color="green"
              @click="
                updateEnvVar(index, {
                  key: envVar.key,
                  value: envVar.value,
                  active: !(envVar.active ?? true),
                })
              "
            />
          </span>
          <span>
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.remove')"
              :icon="IconTrash"
              color="red"
              @click="deleteEnvVar(index)"
            />
          </span>
        </div>
      </template>
    </draggable>
    <HoppSmartPlaceholder
      v-if="envVars.length === 0"
      :src="`/images/states/${colorMode.value}/add_category.svg`"
      :alt="`${t('empty.variables')}`"
      :text="`${t('empty.variables')}`"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import draggable from "vuedraggable-es"
import IconGripVertical from "~icons/lucide/grip-vertical"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCircle from "~icons/lucide/circle"
import IconTrash from "~icons/lucide/trash"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import {
  MCPSTDIOConfig$,
  setMCPSTDIOConfig,
  deleteMCPEnvVar,
  updateMCPEnvVar,
  MCPEnvVar,
} from "~/newstore/MCPSession"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const stdioConfig = useStream(MCPSTDIOConfig$, null, setMCPSTDIOConfig)

const envVars = computed(() => stdioConfig.value?.env || [])

// Use index-based IDs which are stable during edits (most common operation)
// They may shift during drag operations but that's acceptable as the drag
// completes before re-render
const envVarsWithID = computed({
  get() {
    return envVars.value.map((envVar, index) => ({
      id: index,
      envVar,
    }))
  },
  set(newData) {
    if (stdioConfig.value) {
      setMCPSTDIOConfig({
        ...stdioConfig.value,
        env: newData.map(({ envVar }) => envVar),
      })
    }
  },
})

const deleteEnvVar = (index: number) => {
  const oldEnvVars = envVars.value.slice()
  deleteMCPEnvVar(index)
  toast.success(`${t("state.deleted")}`, {
    duration: 4000,
    action: {
      text: `${t("action.undo")}`,
      onClick: (_, toastObject) => {
        if (stdioConfig.value) {
          setMCPSTDIOConfig({
            ...stdioConfig.value,
            env: oldEnvVars,
          })
        }
        toastObject.goAway()
      },
    },
  })
}

const updateEnvVar = (index: number, updated: MCPEnvVar) => {
  updateMCPEnvVar(index, updated)
}
</script>
