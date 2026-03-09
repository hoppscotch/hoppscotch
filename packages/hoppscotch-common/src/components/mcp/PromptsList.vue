<template>
  <div class="flex flex-col flex-1">
    <!-- Search -->
    <div
      class="sticky top-upperSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("mcp.prompts") }}
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

    <!-- Prompts List -->
    <div v-if="filteredPrompts.length > 0" class="flex flex-col">
      <div
        v-for="(prompt, index) in filteredPrompts"
        :key="index"
        class="border-b border-dividerLight"
      >
        <MCPMethodCard
          :method="prompt"
          method-type="prompt"
          @invoke="handleInvoke"
        />
      </div>
    </div>

    <!-- Empty State -->
    <HoppSmartPlaceholder
      v-else
      :src="`/images/states/${colorMode.value}/add_category.svg`"
      :alt="`${t('mcp.no_prompts_available')}`"
      :text="`${t('mcp.no_prompts_available')}`"
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

interface Prompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

const props = defineProps<{
  prompts: Prompt[]
}>()

const emit = defineEmits<{
  invoke: [prompt: Prompt, args: unknown]
}>()

const searchActive = ref(false)
const searchQuery = ref("")

const filteredPrompts = computed(() => {
  if (!searchQuery.value) return props.prompts

  const query = searchQuery.value.toLowerCase()
  return props.prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(query) ||
      prompt.description?.toLowerCase().includes(query)
  )
})

const handleInvoke = (prompt: Prompt, args: unknown) => {
  emit("invoke", prompt, args)
}
</script>
