<template>
  <div class="flex flex-col space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <button
          v-if="content && content.trim()"
          class="flex items-center space-x-1 text-sm font-medium text-secondary hover:text-secondaryDark transition-colors"
          @click="toggleExpanded"
        >
          <icon-lucide-chevron-right
            :class="[
              'h-4 w-4 transition-transform duration-200',
              isExpanded ? 'rotate-90' : 'rotate-0',
            ]"
          />
          <span>{{ title }}</span>
        </button>
        <span v-else class="text-sm font-medium text-secondary">{{
          title
        }}</span>
      </div>
    </div>

    <div v-if="content && content.trim() && isExpanded" class="relative group">
      <div
        class="absolute top-2 right-6 z-10 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <HoppSmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :icon="copySuccess ? IconCheck : IconCopy"
          class="p-1 rounded transition-colors"
          @click="copyContent"
        />
      </div>

      <pre
        class="relative whitespace-pre-wrap text-sm break-words bg-primaryLight border border-dividerLight rounded-lg p-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-divider scrollbar-track-transparent"
        :class="[
          isValidJSON ? 'text-accent' : 'text-secondaryLight',
          'hover:bg-primaryContrast transition-colors',
        ]"
        >{{ formattedContent }}</pre
      >
    </div>

    <div
      v-else-if="!content || !content.trim()"
      class="text-xs text-secondaryLight italic py-2"
    >
      {{ t("state.no_content_found") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "@composables/i18n"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { refAutoReset } from "@vueuse/core"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import { HoppSmartItem } from "@hoppscotch/ui"

interface Props {
  title: string
  content: string | null | undefined
  defaultExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: false,
})

const t = useI18n()

const isExpanded = ref(props.defaultExpanded)
const copySuccess = refAutoReset(false, 1000)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const isValidJSON = computed(() => {
  if (!props.content) return false
  try {
    JSON.parse(props.content)
    return true
  } catch {
    return false
  }
})

const formattedContent = computed(() => {
  if (!props.content) return ""

  if (isValidJSON.value) {
    try {
      const parsed = JSON.parse(props.content)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return props.content
    }
  }

  return props.content
})

const copyContent = () => {
  if (!props.content) return

  try {
    copyToClipboard(formattedContent.value)
    copySuccess.value = true
  } catch (error) {
    console.error("Failed to copy content:", error)
  }
}
</script>
