<template>
  <div class="flex items-center border-b border-dividerLight">
    <span class="flex items-center">
      <label class="ml-4 text-secondaryLight">{{ label }}</label>
      <tippy
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => tippyActions?.focus()"
      >
        <HoppSmartSelectWrapper>
          <HoppButtonSecondary
            :label="currentLabel"
            class="ml-2 rounded-none pr-8"
          />
        </HoppSmartSelectWrapper>
        <template #content="{ hide }">
          <div
            ref="tippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <HoppSmartItem
              v-for="option in options"
              :key="option.id"
              :label="option.label"
              :icon="modelValue === option.id ? IconCircleDot : IconCircle"
              :active="modelValue === option.id"
              @click="
                () => {
                  emit('update:modelValue', option.id)
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"

const props = defineProps<{
  /** Field label shown before the dropdown. */
  label: string
  /** Currently selected option id. */
  modelValue: string
  /** Selectable options. */
  options: readonly { id: string; label: string }[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const tippyActions = ref<any | null>(null)

const currentLabel = computed(
  () =>
    props.options.find((option) => option.id === props.modelValue)?.label ?? ""
)
</script>
