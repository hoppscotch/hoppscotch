<template>
  <div
    class="flex flex-col p-4 border rounded border-divider hover:border-dividerDark cursor-pointer transition"
    @click="$emit('select', server)"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <h4 class="font-semibold text-secondaryDark">{{ server.name }}</h4>
          <span
            v-if="server.popular"
            class="px-2 py-0.5 text-xs font-semibold bg-accent text-accentContrast rounded"
          >
            {{ t("mcp.popular") }}
          </span>
        </div>
        <p class="text-sm text-secondaryLight mt-1">
          {{ server.description }}
        </p>
      </div>
    </div>

    <!-- Transport Badge -->
    <div class="flex items-center gap-2 mt-2">
      <span
        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
        :class="
          server.transport === 'http'
            ? 'bg-green-500/10 text-green-500'
            : 'bg-blue-500/10 text-blue-500'
        "
      >
        <icon-lucide-radio
          v-if="server.transport === 'http'"
          class="svg-icons"
        />
        <icon-lucide-terminal v-else class="svg-icons" />
        {{ server.transport.toUpperCase() }}
      </span>

      <span
        class="px-2 py-1 text-xs font-medium rounded bg-primaryLight text-secondaryLight"
      >
        {{ getCategoryLabel(server.category) }}
      </span>
    </div>

    <!-- Tags -->
    <div
      v-if="server.tags && server.tags.length"
      class="flex flex-wrap gap-1 mt-2"
    >
      <span
        v-for="tag in server.tags.slice(0, 3)"
        :key="tag"
        class="px-2 py-0.5 text-xs rounded bg-primaryLight text-secondaryLight"
      >
        #{{ tag }}
      </span>
      <span
        v-if="server.tags.length > 3"
        class="px-2 py-0.5 text-xs rounded bg-primaryLight text-secondaryLight"
      >
        +{{ server.tags.length - 3 }}
      </span>
    </div>

    <!-- Documentation Link -->
    <div v-if="server.documentation" class="mt-2">
      <a
        :href="server.documentation"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-accent hover:underline flex items-center gap-1"
        @click.stop
      >
        <icon-lucide-external-link class="svg-icons" />
        {{ t("mcp.view_documentation") }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconLucideRadio from "~icons/lucide/radio"
import IconLucideTerminal from "~icons/lucide/terminal"
import IconLucideExternalLink from "~icons/lucide/external-link"
import { useI18n } from "@composables/i18n"
import { SERVER_CATEGORIES, type MCPServerEntry } from "~/helpers/mcp/servers"

const t = useI18n()

defineProps<{
  server: MCPServerEntry
}>()

defineEmits<{
  (e: "select", server: MCPServerEntry): void
}>()

const getCategoryLabel = (categoryId: string) => {
  return SERVER_CATEGORIES.find((c) => c.id === categoryId)?.name || categoryId
}
</script>
