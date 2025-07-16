<template>
  <div
    class="flex border-b divide-x draggable-content group divide-dividerLight border-dividerLight"
  >
    <span>
      <HoppButtonSecondary
        v-tippy="{
          theme: 'tooltip',
          delay: [500, 20],
          content: index !== total - 1 ? t('action.drag_to_reorder') : null,
        }"
        :icon="IconGripVertical"
        class="opacity-0"
        :class="{
          'draggable-handle cursor-grab group-hover:opacity-100':
            index !== total - 1,
        }"
        tabindex="-1"
      />
    </span>
    <SmartEnvInput
      :class="{ 'opacity-50': !entityActive }"
      :model-value="name"
      :placeholder="t('count.key')"
      :auto-complete-source="keyAutoCompleteSource"
      :auto-complete-env="true"
      :envs="envs"
      @update:model-value="emit('update:name', $event)"
      @change="
        updateEntity(index, {
          id: entityId,
          key: $event,
          value: value,
          active: entityActive,
          sendIn: sendIn,
        })
      "
    />
    <SmartEnvInput
      :class="{ 'opacity-50': !entityActive }"
      :model-value="value"
      :placeholder="t('count.value')"
      :auto-complete-env="true"
      :envs="envs"
      @update:model-value="emit('update:value', $event)"
      @change="
        updateEntity(index, {
          id: entityId,
          key: name,
          value: $event,
          active: entityActive,
          sendIn: sendIn,
        })
      "
    />
    <!-- Send In auto-completable input -->
    <SmartEnvInput
      :class="{ 'opacity-50': !entityActive }"
      :model-value="sendIn"
      :placeholder="t('authorization.oauth.send_in')"
      :auto-complete-source="sendInOptions"
      :auto-complete-env="false"
      @update:model-value="emit('update:sendIn', $event)"
      @change="
        updateEntity(index, {
          id: entityId,
          key: name,
          value: value,
          active: entityActive,
          sendIn: $event,
        })
      "
    />
    <span>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="entityActive ? t('action.turn_off') : t('action.turn_on')"
        :icon="entityActive ? IconCheckCircle : IconCircle"
        color="green"
        :class="{
          'text-accent': entityActive,
        }"
        @click="
          updateEntity(index, {
            id: entityId,
            key: name,
            value: value,
            active: !entityActive,
            sendIn: sendIn,
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
        @click="deleteEntity(index)"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { AggregateEnvironment } from "~/newstore/environments"
import IconGripVertical from "~icons/lucide/grip-vertical"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCircle from "~icons/lucide/circle"
import IconTrash from "~icons/lucide/trash"

interface Entity {
  id: number
  key: string
  value: string
  active: boolean
  sendIn?: string
}

const t = useI18n()

defineProps<{
  total: number
  index: number
  entityId: number
  isActive: boolean
  entityActive: boolean
  name: string
  value: string
  sendIn?: string
  envs?: AggregateEnvironment[]
  keyAutoCompleteSource?: string[]
  sendInOptions?: string[]
}>()

const emit = defineEmits<{
  (e: "update:name", value: string): void
  (e: "update:value", value: string): void
  (e: "update:sendIn", value: string): void
  (e: "deleteEntity", value: number): void
  (
    e: "updateEntity",
    { index, payload }: { index: number; payload: Entity }
  ): void
}>()

const updateEntity = (index: number, payload: Entity) => {
  emit("updateEntity", {
    index,
    payload,
  })
}

const deleteEntity = (index: number) => {
  emit("deleteEntity", index)
}
</script>
