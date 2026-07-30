<template>
  <div class="flex flex-col flex-1">
    <!-- Header -->
    <div class="p-4 border-b border-dividerLight">
      <h3 class="text-lg font-semibold text-secondaryDark">
        {{ t("mcp.server_catalog") }}
      </h3>
      <p class="text-sm text-secondaryLight mt-1">
        {{ t("mcp.server_catalog_description") }}
      </p>
    </div>

    <!-- Search -->
    <div class="p-4 border-b border-dividerLight">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('action.search')"
        class="w-full bg-primaryLight px-4 py-2 border rounded border-divider"
      />
    </div>

    <!-- Category Filter -->
    <div class="p-4 border-b border-dividerLight">
      <div class="flex flex-wrap gap-2">
        <HoppButtonSecondary
          :label="t('mcp.all_categories')"
          :filled="selectedCategory === null"
          @click="selectedCategory = null"
        />
        <HoppButtonSecondary
          v-for="category in categories"
          :key="category.id"
          :label="category.name"
          :filled="selectedCategory === category.id"
          @click="selectedCategory = category.id"
        />
      </div>
    </div>

    <!-- Popular Servers (when no filter) -->
    <div
      v-if="!searchQuery && selectedCategory === null && popularServers.length"
      class="p-4 border-b border-dividerLight"
    >
      <h4 class="text-sm font-semibold text-secondaryLight uppercase mb-3">
        {{ t("mcp.popular_servers") }}
      </h4>
      <div class="grid grid-cols-1 gap-2">
        <ServerCard
          v-for="server in popularServers"
          :key="server.id"
          :server="server"
          @select="handleSelectServer"
        />
      </div>
    </div>

    <!-- Server List -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="filteredServers.length > 0" class="p-4">
        <div class="grid grid-cols-1 gap-2">
          <ServerCard
            v-for="server in filteredServers"
            :key="server.id"
            :server="server"
            @select="handleSelectServer"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="flex flex-col items-center justify-center p-8 text-center"
      >
        <icon-lucide-inbox class="svg-icons mb-4 opacity-50" />
        <p class="text-secondaryLight">
          {{ t("mcp.no_servers_found") }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import IconLucideInbox from "~icons/lucide/inbox"
import { useI18n } from "@composables/i18n"
import {
  MCP_SERVER_CATALOG,
  getPopularServers,
  searchServers,
  SERVER_CATEGORIES,
  type MCPServerEntry,
} from "~/helpers/mcp/servers"
import ServerCard from "./ServerCard.vue"

const t = useI18n()

const emit = defineEmits<{
  (e: "select", server: MCPServerEntry): void
}>()

const searchQuery = ref("")
const selectedCategory = ref<string | null>(null)

const categories = SERVER_CATEGORIES

const popularServers = computed(() => getPopularServers())

const filteredServers = computed(() => {
  let servers = MCP_SERVER_CATALOG

  // Apply search
  if (searchQuery.value) {
    servers = searchServers(searchQuery.value)
  }

  // Apply category filter
  if (selectedCategory.value) {
    servers = servers.filter((s) => s.category === selectedCategory.value)
  }

  // Exclude popular servers if showing all
  if (!searchQuery.value && selectedCategory.value === null) {
    servers = servers.filter((s) => !s.popular)
  }

  return servers
})

const handleSelectServer = (server: MCPServerEntry) => {
  emit("select", server)
}
</script>
