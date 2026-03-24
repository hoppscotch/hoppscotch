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
            autocomplete="off"
            type="text"
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
            autocomplete="off"
            type="text"
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
                envVar.active ? t('action.turn_off') : t('action.turn_on')
              "
              :icon="envVar.active ? IconCheckCircle : IconCircle"
              color="green"
              @click="
                updateEnvVar(index, {
                  key: envVar.key,
                  value: envVar.value,
                  active: !envVar.active,
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
import { MCPEnvVar, MCPSTDIOConfig } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useStream } from "@composables/stream"
import {
  MCPSTDIOConfig$,
  deleteMCPEnvVar,
  setMCPSTDIOConfig,
  updateMCPEnvVar,
} from "~/newstore/MCPSession"

const t = useI18n()
const colorMode = useColorMode()

const stdioConfig = useStream<MCPSTDIOConfig | null>(
  MCPSTDIOConfig$,
  null,
  setMCPSTDIOConfig
)

const envVars = computed(() => stdioConfig.value?.env ?? [])

const envVarsWithID = computed({
  get() {
    return envVars.value.map((envVar, index) => ({
      id: `${envVar.key}-${index}`,
      envVar,
    }))
  },
  set(newValue: Array<{ id: string; envVar: MCPEnvVar }>) {
    if (!stdioConfig.value) {
      return
    }

    setMCPSTDIOConfig({
      ...stdioConfig.value,
      env: newValue.map(({ envVar }) => envVar),
    })
  },
})

const updateEnvVar = (index: number, envVar: MCPEnvVar) => {
  updateMCPEnvVar(index, envVar)
}

const deleteEnvVar = (index: number) => {
  deleteMCPEnvVar(index)
}
</script>
