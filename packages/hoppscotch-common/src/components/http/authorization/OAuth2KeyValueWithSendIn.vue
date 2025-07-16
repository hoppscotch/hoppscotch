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
    <!-- Send In dropdown select -->
    <div class="flex flex-1">
      <tippy
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => sendInTippyActions?.focus()"
      >
        <HoppSmartSelectWrapper>
          <HoppButtonSecondary
            :class="{ 'opacity-50': !entityActive }"
            class="flex-1 rounded-none text-left"
            :label="sendIn || t('authorization.oauth.send_in')"
          />
        </HoppSmartSelectWrapper>
        <template #content="{ hide }">
          <div
            ref="sendInTippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <HoppSmartItem
              v-for="option in sendInOptions"
              :key="option"
              :label="option"
              :icon="option === sendIn ? IconCircleDot : IconCircle"
              :active="option === sendIn"
              @click="
                () => {
                  emit('update:sendIn', option)
                  updateEntity(index, {
                    id: entityId,
                    key: name,
                    value: value,
                    active: entityActive,
                    sendIn: option,
                  })
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
    </div>
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
import { ref } from "vue"
import { useI18n } from "@composables/i18n"
import { AggregateEnvironment } from "~/newstore/environments"
import IconGripVertical from "~icons/lucide/grip-vertical"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconTrash from "~icons/lucide/trash"

interface Entity {
  id: number
  key: string
  value: string
  active: boolean
  sendIn?: string
}

const t = useI18n()
const sendInTippyActions = ref<HTMLDivElement>()

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
