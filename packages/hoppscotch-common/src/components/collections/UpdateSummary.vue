<template>
  <div class="flex flex-col p-1">
    <div class="space-y-4 p-1">
      <div>
        <p class="flex items-center text-green-500">
          <span
            class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary"
          >
            <icon-lucide-check-circle class="svg-icons" />
          </span>
          <span class="font-semibold text-secondaryDark">
            {{ t("collection.summary_title") }}
          </span>
        </p>
      </div>

      <div class="ml-10 space-y-2 text-secondary">
        <p v-if="stats.updatedRequests > 0" class="flex items-center space-x-2">
          <span class="font-medium text-accent">
            {{ stats.updatedRequests }}
          </span>
          <span>{{ t("collection.requests_updated") }}</span>
        </p>

        <p v-if="stats.addedRequests > 0" class="flex items-center space-x-2">
          <span class="font-medium text-green-500">
            +{{ stats.addedRequests }}
          </span>
          <span>{{ t("collection.requests_added") }}</span>
        </p>

        <p
          v-if="stats.preservedRequests > 0"
          class="flex items-center space-x-2"
        >
          <span class="font-medium text-secondaryLight">
            {{ stats.preservedRequests }}
          </span>
          <span>{{ t("collection.requests_preserved") }}</span>
        </p>

        <p v-if="stats.deletedRequests > 0" class="flex items-center space-x-2">
          <span class="font-medium text-red-500">
            -{{ stats.deletedRequests }}
          </span>
          <span>{{ t("collection.requests_deleted") }}</span>
        </p>

        <p v-if="stats.updatedFolders > 0" class="flex items-center space-x-2">
          <span class="font-medium text-accent">
            {{ stats.updatedFolders }}
          </span>
          <span>{{ t("collection.folders_updated") }}</span>
        </p>

        <p v-if="stats.addedFolders > 0" class="flex items-center space-x-2">
          <span class="font-medium text-green-500">
            +{{ stats.addedFolders }}
          </span>
          <span>{{ t("collection.folders_added") }}</span>
        </p>

        <p
          v-if="stats.preservedScripts > 0"
          class="flex items-center space-x-2"
        >
          <span class="font-medium text-green-500">
            {{ stats.preservedScripts }}
          </span>
          <span>{{ t("collection.scripts_preserved") }}</span>
        </p>
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <HoppButtonPrimary
        :label="t('action.done')"
        class="w-full"
        @click="onClose"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { UpdateSummaryData } from "~/helpers/collection/update"

const t = useI18n()

const props = defineProps<{
  updateSummaryData?: UpdateSummaryData
  onClose: () => void
}>()

const stats = computed<UpdateSummaryData>(() => {
  return (
    props.updateSummaryData ?? {
      updatedRequests: 0,
      addedRequests: 0,
      preservedRequests: 0,
      deletedRequests: 0,
      updatedFolders: 0,
      addedFolders: 0,
      preservedScripts: 0,
    }
  )
})
</script>
