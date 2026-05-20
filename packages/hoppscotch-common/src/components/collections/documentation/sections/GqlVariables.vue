<template>
  <div v-if="hasVariables" class="w-full space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      <span>{{ t("documentation.variables.title") }}</span>
    </h2>
    <div class="px-4 py-2">
      <pre
        class="bg-primaryLight p-3 rounded my-2 overflow-auto max-h-64 text-xs font-mono text-secondaryLight"
        >{{ formatted }}</pre
      >
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = defineProps<{
  variables?: string
}>()

// GQL variables are stored as a JSON string. An empty `{}` is the schema
// default — render the section only when the user has actually populated it.
const hasVariables = computed(() => {
  if (!props.variables) return false
  const trimmed = props.variables.trim()
  return trimmed.length > 0 && trimmed !== "{}"
})

const formatted = computed(() => {
  if (!props.variables) return ""
  try {
    return JSON.stringify(JSON.parse(props.variables), null, 2)
  } catch {
    return props.variables
  }
})
</script>
