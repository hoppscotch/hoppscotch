<template>
  <button
    class="flex w-full flex-col gap-3 rounded border border-divider p-4 text-left transition hover:border-dividerDark hover:bg-primaryLight"
    type="button"
    @click="emit('select', server)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="font-semibold text-secondaryDark">
            {{ server.name }}
          </h4>
          <span
            v-if="server.popular"
            class="rounded bg-accent px-2 py-0.5 text-tiny font-semibold text-accentContrast"
          >
            {{ t("mcp.popular") }}
          </span>
        </div>
        <p class="mt-1 text-sm text-secondaryLight">
          {{ server.description }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span
        class="rounded px-2 py-1 text-tiny font-medium"
        :class="
          server.transport === 'http'
            ? 'bg-green-500/10 text-green-500'
            : 'bg-blue-500/10 text-blue-500'
        "
      >
        {{ server.transport.toUpperCase() }}
      </span>
      <span
        class="rounded bg-primaryDark px-2 py-1 text-tiny font-medium text-secondaryLight"
      >
        {{ getCategoryLabel(server.category) }}
      </span>
    </div>

    <div v-if="server.tags?.length" class="flex flex-wrap gap-2">
      <span
        v-for="tag in server.tags.slice(0, 4)"
        :key="tag"
        class="rounded bg-primaryDark px-2 py-0.5 text-tiny text-secondaryLight"
      >
        #{{ tag }}
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { MCPServerEntry, SERVER_CATEGORIES } from "~/helpers/mcp/servers"

defineProps<{
  server: MCPServerEntry
}>()

const emit = defineEmits<{
  (e: "select", server: MCPServerEntry): void
}>()

const t = useI18n()

const getCategoryLabel = (categoryId: MCPServerEntry["category"]) =>
  SERVER_CATEGORIES.find((category) => category.id === categoryId)?.name ??
  categoryId
</script>
