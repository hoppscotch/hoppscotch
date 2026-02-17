<template>
  <div class="flex flex-col space-y-6">
    <div>
      <HoppSmartInput
        v-model="titleModel"
        :label="t('documentation.publish.doc_title')"
        type="text"
        input-styles="floating-input"
      />
    </div>

    <div
      v-if="isFirstPublish"
      class="flex items-start space-x-2 px-3 py-2.5 rounded-md bg-green-500/5 border border-green-500/15"
    >
      <icon-lucide-info
        class="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5"
      />
      <span class="text-xs text-green-600 leading-relaxed">
        {{ t("documentation.publish.first_publish_hint") }}
      </span>
    </div>

    <!-- Version Input (hidden for first publish) -->
    <div v-if="!isFirstPublish">
      <HoppSmartInput
        v-model="versionModel"
        :label="t('documentation.publish.doc_version')"
        :disabled="mode === 'update'"
        :input-styles="[
          'floating-input',
          !isValidVersion && versionModel.length > 0
            ? '!border-red-500 !focus:border-red-500'
            : '',
        ]"
      />
      <span
        v-if="!isValidVersion && versionModel.length > 0"
        class="text-xs text-red-500 mt-1 block"
      >
        {{ t("documentation.publish.invalid_version") }}
      </span>
      <span
        v-if="mode === 'create' && isValidVersion"
        class="text-xs text-secondaryLight mt-1 block"
      >
        {{ t("documentation.publish.snapshot_description") }}
      </span>
    </div>

    <!-- Auto-sync Toggle (hidden for first publish and for live versions) -->
    <div v-if="!isFirstPublish && !isAutoSyncLocked" class="flex items-start">
      <HoppSmartCheckbox
        :on="autoSyncModel"
        @change="autoSyncModel = !autoSyncModel"
      >
        <div>
          <span class="text-sm text-secondaryDark">
            {{ t("documentation.publish.auto_sync") }}
          </span>
          <span class="text-tiny text-secondaryLight">
            ({{ t("documentation.publish.auto_sync_description") }})
          </span>
        </div>
      </HoppSmartCheckbox>
    </div>

    <!-- Environment Selector -->
    <div class="space-y-2">
      <span class="block text-sm font-medium text-secondaryDark">
        {{ t("documentation.publish.environment") }}
      </span>
      <p class="text-xs text-secondaryLight">
        {{ t("documentation.publish.environment_description") }}
      </p>
      <p class="text-tiny text-secondaryLight !mt-1">
        {{ t("documentation.publish.sensitive_data_warning") }}
      </p>
      <CollectionsDocumentationEnvironmentPicker
        v-model="environmentModel"
        :workspace-type="workspaceType"
        :workspace-i-d="workspaceID"
      />
    </div>

    <!-- Published URL (shown after publishing or in update mode) -->
    <div v-if="publishedUrl || mode === 'update'" class="space-y-2">
      <div class="flex items-center space-x-2">
        <HoppSmartInput
          :model-value="publishedUrl"
          :label="t('documentation.publish.published_url')"
          type="text"
          disabled
          input-styles="floating-input"
          class="flex-1 opacity-80 cursor-not-allowed"
        />
        <HoppButtonSecondary
          v-if="publishedUrl"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('documentation.publish.copy_url')"
          :icon="IconCopy"
          outline
          @click="$emit('copyUrl')"
        />
        <HoppButtonPrimary
          v-if="publishedUrl"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('documentation.publish.open_published_doc')"
          :label="t('action.open')"
          :icon="IconExternalLink"
          @click="$emit('viewPublished')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { WorkspaceType } from "~/helpers/backend/graphql"
import IconCopy from "~icons/lucide/copy"
import IconExternalLink from "~icons/lucide/external-link"

const t = useI18n()

const props = defineProps<{
  publishTitle: string
  publishVersion: string
  autoSync: boolean
  selectedEnvironmentID: string | null
  publishedUrl: string | null
  isFirstPublish: boolean
  isAutoSyncLocked: boolean
  isValidVersion: boolean
  workspaceType: WorkspaceType
  workspaceID: string
  mode: "create" | "update"
}>()

const emit = defineEmits<{
  (e: "update:publishTitle", value: string): void
  (e: "update:publishVersion", value: string): void
  (e: "update:autoSync", value: boolean): void
  (e: "update:selectedEnvironmentID", value: string | null): void
  (e: "copyUrl"): void
  (e: "viewPublished"): void
}>()

const titleModel = computed({
  get: () => props.publishTitle,
  set: (v) => emit("update:publishTitle", v),
})

const versionModel = computed({
  get: () => props.publishVersion,
  set: (v) => emit("update:publishVersion", v),
})

const autoSyncModel = computed({
  get: () => props.autoSync,
  set: (v) => emit("update:autoSync", v),
})

const environmentModel = computed({
  get: () => props.selectedEnvironmentID,
  set: (v) => emit("update:selectedEnvironmentID", v),
})
</script>
