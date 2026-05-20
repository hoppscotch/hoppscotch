<template>
  <div v-if="query" class="w-full space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end justify-between px-4 p-2 border-b border-divider"
    >
      <span>{{ t("documentation.query.title") }}</span>
      <HoppSmartItem
        :icon="copied ? IconCheck : IconCopy"
        :title="t('documentation.copy_to_clipboard')"
        @click="copyToClipboard"
      />
    </h2>
    <div class="px-4 py-2">
      <pre
        class="bg-primaryLight p-3 rounded my-2 overflow-auto max-h-96 text-xs font-mono text-secondaryLight whitespace-pre"
        >{{ query }}</pre
      >
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  query?: string
}>()

const copied = ref(false)

const copyToClipboard = async () => {
  if (!props.query) return
  try {
    await navigator.clipboard.writeText(props.query)
    copied.value = true
    toast.success(t("documentation.copied_to_clipboard"))
    setTimeout(() => (copied.value = false), 1000)
  } catch (err) {
    console.error("Failed to copy: ", err)
  }
}
</script>
