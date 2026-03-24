<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky top-0 z-10 flex items-center justify-between border-b border-dividerLight bg-primary px-4 py-3"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("mcp.prompts") }}
      </label>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.search')"
        :icon="IconSearch"
        @click="searchActive = !searchActive"
      />
    </div>

    <div
      v-if="searchActive"
      class="border-b border-dividerLight bg-primary p-3"
    >
      <HoppSmartInput
        v-model="searchQuery"
        placeholder=" "
        :label="t('mcp.search_methods')"
        input-styles="floating-input"
      />
    </div>

    <div v-if="filteredPrompts.length > 0" class="flex flex-col">
      <div
        v-for="prompt in filteredPrompts"
        :key="prompt.name"
        class="border-b border-dividerLight"
      >
        <McpMethodCard
          :method="prompt"
          method-type="prompt"
          @invoke="handleInvoke"
        />
      </div>
    </div>

    <HoppSmartPlaceholder
      v-else
      :src="`/images/states/${colorMode.value}/add_category.svg`"
      :alt="`${t('mcp.no_prompts_available')}`"
      :text="`${t('mcp.no_prompts_available')}`"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import IconSearch from "~icons/lucide/search"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { MCPPrompt } from "~/helpers/realtime/MCPConnection"

const props = defineProps<{
  prompts: MCPPrompt[]
}>()

const emit = defineEmits<{
  (e: "invoke", prompt: MCPPrompt, args: unknown): void
}>()

const t = useI18n()
const colorMode = useColorMode()

const searchActive = ref(false)
const searchQuery = ref("")

const filteredPrompts = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.prompts
  }

  const query = searchQuery.value.toLowerCase()

  return props.prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(query) ||
      (prompt.description?.toLowerCase().includes(query) ?? false)
  )
})

const handleInvoke = (prompt: MCPPrompt, args: unknown) => {
  emit("invoke", prompt, args)
}
</script>
