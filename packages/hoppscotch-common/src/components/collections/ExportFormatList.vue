<template>
  <div class="flex flex-col">
    <div class="flex flex-col space-y-2">
      <HoppSmartItem
        :icon="IconFolderPlus"
        :label="t('export.format_hoppscotch')"
        :loading="activeFormat === 'hoppscotch'"
        :disabled="loading"
        @click="onSelect('hoppscotch')"
      />
      <HoppSmartItem
        :icon="IconBraces"
        :label="t('export.format_openapi_json')"
        :loading="activeFormat === 'openapi-json'"
        :disabled="loading"
        @click="onSelect('openapi-json')"
      />
      <HoppSmartItem
        :icon="IconFileText"
        :label="t('export.format_openapi_yaml')"
        :loading="activeFormat === 'openapi-yaml'"
        :disabled="loading"
        @click="onSelect('openapi-yaml')"
      />
    </div>
    <div
      v-if="showLossyWarning"
      class="mt-4 flex items-start space-x-3 rounded border border-yellow-500/40 bg-primaryLight px-3 py-3 shadow-sm"
      role="alert"
    >
      <IconAlertCircle class="flex-shrink-0 svg-icons text-yellow-500" />
      <div class="flex-1 space-y-1.5">
        <p class="font-semibold text-secondary">
          {{ t("export.openapi_lossy_title") }}
        </p>
        <ul class="space-y-1 text-secondaryLight text-tiny">
          <li class="leading-relaxed">
            {{ t("export.openapi_lossy_auth") }}
          </li>
          <li class="leading-relaxed">
            {{ t("export.openapi_lossy_scripts") }}
          </li>
          <li class="leading-relaxed">
            {{ t("export.openapi_lossy_inactive") }}
          </li>
          <li class="leading-relaxed">
            {{ t("export.openapi_lossy_duplicates") }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconAlertCircle from "~icons/lucide/alert-circle"
import IconBraces from "~icons/lucide/braces"
import IconFileText from "~icons/lucide/file-text"
import IconFolderPlus from "~icons/lucide/folder-plus"
import { useI18n } from "@composables/i18n"
import { computed, ref, toRefs, watch } from "vue"

const t = useI18n()

const props = defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  (e: "export-hoppscotch"): void
  (e: "export-openapi", format: "json" | "yaml"): void
}>()

type Format = "hoppscotch" | "openapi-json" | "openapi-yaml"

const activeFormat = ref<Format | null>(null)

const onSelect = (format: Format) => {
  if (props.loading) return
  activeFormat.value = format
  if (format === "hoppscotch") emit("export-hoppscotch")
  else if (format === "openapi-json") emit("export-openapi", "json")
  else emit("export-openapi", "yaml")
}

// Hoppscotch JSON export is lossless; the warning only applies to OpenAPI.
// Show it by default (before any selection) and while an OpenAPI export is in
// flight; hide it once the user picks Hoppscotch JSON.
const showLossyWarning = computed(() => activeFormat.value !== "hoppscotch")

const { loading } = toRefs(props)
watch(loading, (val) => {
  if (!val) activeFormat.value = null
})
</script>
