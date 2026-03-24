<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky top-0 z-10 flex items-center justify-between border-b border-dividerLight bg-primary px-4 py-3"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("mcp.resources") }}
      </label>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.search')"
        :icon="IconSearch"
        @click="searchActive = !searchActive; if (!searchActive) searchQuery = ''"
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

    <div v-if="filteredResources.length > 0" class="flex flex-col">
      <div
        v-for="resource in filteredResources"
        :key="resource.uri"
        class="group flex items-center justify-between gap-4 border-b border-dividerLight p-4 hover:bg-primaryLight"
      >
        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="truncate font-semibold text-secondaryDark">
              {{ resource.name }}
            </span>
            <span
              v-if="resource.mimeType"
              class="rounded bg-primaryDark px-2 py-0.5 text-tiny text-secondaryLight"
            >
              {{ resource.mimeType }}
            </span>
          </div>
          <p v-if="resource.description" class="text-sm text-secondaryLight">
            {{ resource.description }}
          </p>
          <p class="truncate font-mono text-tiny text-secondaryLight">
            {{ resource.uri }}
          </p>
        </div>

        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.open')"
          :icon="IconEye"
          class="opacity-0 group-hover:opacity-100"
          @click="emit('read', resource)"
        />
      </div>
    </div>

    <HoppSmartPlaceholder
      v-else
      :src="`/images/states/${colorMode.value}/add_category.svg`"
      :alt="`${t('mcp.no_resources_available')}`"
      :text="`${t('mcp.no_resources_available')}`"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import IconEye from "~icons/lucide/eye"
import IconSearch from "~icons/lucide/search"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { MCPResource } from "~/helpers/realtime/MCPConnection"

const props = defineProps<{
  resources: MCPResource[]
}>()

const emit = defineEmits<{
  (e: "read", resource: MCPResource): void
}>()

const t = useI18n()
const colorMode = useColorMode()

const searchActive = ref(false)
const searchQuery = ref("")

const filteredResources = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.resources
  }

  const query = searchQuery.value.toLowerCase()

  return props.resources.filter(
    (resource) =>
      resource.name.toLowerCase().includes(query) ||
      resource.uri.toLowerCase().includes(query) ||
      (resource.description?.toLowerCase().includes(query) ?? false)
  )
})
</script>
