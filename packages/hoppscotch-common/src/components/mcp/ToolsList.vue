<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky top-0 z-10 flex items-center justify-between border-b border-dividerLight bg-primary px-4 py-3"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("mcp.tools") }}
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

    <div v-if="filteredTools.length > 0" class="flex flex-col">
      <div
        v-for="tool in filteredTools"
        :key="tool.name"
        class="border-b border-dividerLight"
      >
        <McpMethodCard
          :method="tool"
          method-type="tool"
          @invoke="handleInvoke"
        />
      </div>
    </div>

    <HoppSmartPlaceholder
      v-else
      :src="`/images/states/${colorMode.value}/add_category.svg`"
      :alt="`${t('mcp.no_tools_available')}`"
      :text="`${t('mcp.no_tools_available')}`"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import IconSearch from "~icons/lucide/search"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { MCPTool } from "~/helpers/realtime/MCPConnection"

const props = defineProps<{
  tools: MCPTool[]
}>()

const emit = defineEmits<{
  (e: "invoke", tool: MCPTool, args: unknown): void
}>()

const t = useI18n()
const colorMode = useColorMode()

const searchActive = ref(false)
const searchQuery = ref("")

const filteredTools = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.tools
  }

  const query = searchQuery.value.toLowerCase()

  return props.tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(query) ||
      (tool.description?.toLowerCase().includes(query) ?? false)
  )
})

const handleInvoke = (tool: MCPTool, args: unknown) => {
  emit("invoke", tool, args)
}
</script>
