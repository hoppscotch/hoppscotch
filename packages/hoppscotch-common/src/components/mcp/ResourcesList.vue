<template>
  <div class="flex flex-col flex-1">
    <!-- Search -->
    <div
      class="sticky top-upperSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("mcp.resources") }}
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

    <!-- Resources List -->
    <div v-if="filteredResources.length > 0" class="flex flex-col">
      <div
        v-for="(resource, index) in filteredResources"
        :key="index"
        class="group flex items-center justify-between border-b border-dividerLight p-4 hover:bg-primaryLight"
      >
        <div class="flex flex-col flex-1 space-y-1">
          <div class="flex items-center space-x-2">
            <span class="font-semibold text-secondaryDark">{{
              resource.name
            }}</span>
            <span
              v-if="resource.mimeType"
              class="text-xs text-secondaryLight px-2 py-0.5 bg-primaryDark rounded"
            >
              {{ resource.mimeType }}
            </span>
          </div>
          <span v-if="resource.description" class="text-sm text-secondaryLight">
            {{ resource.description }}
          </span>
          <span class="text-xs text-secondaryLight font-mono">{{
            resource.uri
          }}</span>
        </div>
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.open')"
          :icon="IconEye"
          class="opacity-0 group-hover:opacity-100"
          @click="handleRead(resource)"
        />
      </div>
    </div>

    <!-- Empty State -->
    <HoppSmartPlaceholder
      v-else
      :src="`/images/states/${colorMode.value}/add_category.svg`"
      :alt="`${t('mcp.no_resources_available')}`"
      :text="`${t('mcp.no_resources_available')}`"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import IconSearch from "~icons/lucide/search"
import IconEye from "~icons/lucide/eye"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"

const t = useI18n()
const colorMode = useColorMode()

interface Resource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

const props = defineProps<{
  resources: Resource[]
}>()

const emit = defineEmits<{
  read: [resource: Resource]
}>()

const searchActive = ref(false)
const searchQuery = ref("")

const filteredResources = computed(() => {
  if (!searchQuery.value) return props.resources

  const query = searchQuery.value.toLowerCase()
  return props.resources.filter(
    (resource) =>
      resource.name.toLowerCase().includes(query) ||
      resource.description?.toLowerCase().includes(query) ||
      resource.uri.toLowerCase().includes(query)
  )
})

const handleRead = (resource: Resource) => {
  emit("read", resource)
}
</script>
