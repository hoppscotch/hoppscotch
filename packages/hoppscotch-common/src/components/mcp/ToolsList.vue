<template>
  <div class="flex flex-col flex-1">
    <!-- Search -->
    <div
      class="sticky top-upperSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("mcp.tools") }}
      </label>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.search')"
          :icon="IconSearch"
          @click="searchActive = !searchActive"
        />
      </div>
    </div>

    <!-- Search Input -->
    <div
      v-if="searchActive"
      class="flex border-b border-dividerLight bg-primary p-2"
    >
      <input
        v-model="searchQuery"
        class="flex flex-1 bg-primaryLight px-4 py-2 border rounded border-divider"
        :placeholder="t('mcp.search_methods')"
        type="text"
      />
    </div>

    <!-- Tools List -->
    <div v-if="filteredTools.length > 0" class="flex flex-col">
      <div
        v-for="(tool, index) in filteredTools"
        :key="index"
        class="border-b border-dividerLight"
      >
        <MCPMethodCard
          :method="tool"
          method-type="tool"
          @invoke="handleInvoke"
        />
      </div>
    </div>

    <!-- Empty State -->
    <HoppSmartPlaceholder
      v-else
      :src="`/images/states/${colorMode.value}/add_category.svg`"
      :alt="`${t('mcp.no_tools_available')}`"
      :text="`${t('mcp.no_tools_available')}`"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import IconSearch from "~icons/lucide/search"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import MCPMethodCard from "./MethodCard.vue"

const t = useI18n()
const colorMode = useColorMode()

interface Tool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

const props = defineProps<{
  tools: Tool[]
}>()

const emit = defineEmits<{
  invoke: [tool: Tool, args: unknown]
}>()

const searchActive = ref(false)
const searchQuery = ref("")

const filteredTools = computed(() => {
  if (!searchQuery.value) return props.tools

  const query = searchQuery.value.toLowerCase()
  return props.tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(query) ||
      tool.description?.toLowerCase().includes(query)
  )
})

const handleInvoke = (tool: Tool, args: unknown) => {
  emit("invoke", tool, args)
}
</script>
