<template>
  <div class="flex flex-col">
    <div class="border-b border-dividerLight px-4 py-3">
      <h3 class="font-semibold text-secondaryDark">
        {{ t("mcp.server_catalog") }}
      </h3>
      <p class="mt-1 text-sm text-secondaryLight">
        {{ t("mcp.server_catalog_description") }}
      </p>
    </div>

    <div class="border-b border-dividerLight p-4">
      <HoppSmartInput
        v-model="searchQuery"
        placeholder=" "
        :label="t('action.search')"
        input-styles="floating-input"
      />
    </div>

    <div class="border-b border-dividerLight p-4">
      <div class="flex flex-wrap gap-2">
        <HoppButtonSecondary
          :label="t('mcp.all_categories')"
          :filled="selectedCategory === null"
          @click="selectedCategory = null"
        />
        <HoppButtonSecondary
          v-for="category in SERVER_CATEGORIES"
          :key="category.id"
          :label="category.name"
          :filled="selectedCategory === category.id"
          @click="selectedCategory = category.id"
        />
      </div>
    </div>

    <div
      v-if="
        !searchQuery.trim() &&
        selectedCategory === null &&
        popularServers.length > 0
      "
      class="border-b border-dividerLight p-4"
    >
      <h4 class="mb-3 text-tiny font-semibold text-secondaryLight">
        {{ t("mcp.popular_servers") }}
      </h4>
      <div class="grid gap-3">
        <McpServerCard
          v-for="server in popularServers"
          :key="server.id"
          :server="server"
          @select="emit('select', $event)"
        />
      </div>
    </div>

    <div v-if="filteredServers.length > 0" class="grid gap-3 p-4">
      <McpServerCard
        v-for="server in filteredServers"
        :key="server.id"
        :server="server"
        @select="emit('select', $event)"
      />
    </div>

    <div v-else class="p-6 text-sm text-secondaryLight">
      {{ t("mcp.no_servers_found") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "@composables/i18n"
import {
  MCP_SERVER_CATALOG,
  MCPServerEntry,
  SERVER_CATEGORIES,
  getPopularServers,
  searchServers,
} from "~/helpers/mcp/servers"

const emit = defineEmits<{
  (e: "select", server: MCPServerEntry): void
}>()

const t = useI18n()

const searchQuery = ref("")
const selectedCategory = ref<MCPServerEntry["category"] | null>(null)

const popularServers = computed(() => getPopularServers())

const filteredServers = computed(() => {
  const baseServers = searchQuery.value.trim()
    ? searchServers(searchQuery.value)
    : MCP_SERVER_CATALOG

  return baseServers.filter((server) => {
    if (selectedCategory.value && server.category !== selectedCategory.value) {
      return false
    }

    if (!searchQuery.value.trim() && selectedCategory.value === null) {
      return !server.popular
    }

    return true
  })
})
</script>
