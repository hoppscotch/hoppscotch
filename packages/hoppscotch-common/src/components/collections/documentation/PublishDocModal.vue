<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="modalTitle"
    :styles="mode === 'view' ? 'sm:max-w-6xl' : 'sm:max-w-2xl'"
    @close="hideModal"
  >
    <template #body>
      <CollectionsDocumentationPublishDocSnapshotPreview
        v-if="mode === 'view'"
        :existing-data="existingData"
        :published-url="publishedUrl"
        :show="show && mode === 'view'"
        @copy-url="copyUrl"
        @view-published="viewPublished"
      />

      <!-- Create/Update mode: Form -->
      <CollectionsDocumentationPublishDocForm
        v-else
        v-model:publish-title="publishTitle"
        v-model:publish-version="publishVersion"
        v-model:auto-sync="autoSync"
        v-model:selected-environment-i-d="selectedEnvironmentID"
        :published-url="publishedUrl"
        :is-first-publish="isFirstPublish ?? false"
        :is-auto-sync-locked="isAutoSyncLocked ?? false"
        :is-valid-version="isValidVersion"
        :workspace-type="workspaceType"
        :workspace-i-d="workspaceID"
        :mode="mode === 'update' ? 'update' : 'create'"
        @copy-url="copyUrl"
        @view-published="viewPublished"
      />
    </template>

    <template #footer>
      <div class="flex justify-between items-center flex-1">
        <div class="flex items-center space-x-2">
          <HoppButtonPrimary
            v-if="mode === 'create' && !publishedUrl"
            :label="t('documentation.publish.button')"
            :disabled="!canPublish || loading"
            :loading="loading"
            @click="handlePublish"
          />
          <HoppButtonPrimary
            v-else-if="mode === 'update'"
            :label="t('documentation.publish.update_button')"
            :disabled="!canPublish || loading || !hasChanges"
            :loading="loading"
            @click="handleUpdate"
          />
          <HoppButtonSecondary
            :label="mode === 'view' ? t('action.close') : t('action.cancel')"
            outline
            filled
            @click="hideModal"
          />
        </div>
        <div v-if="mode === 'update' || mode === 'view'" class="flex">
          <HoppButtonSecondary
            :icon="IconTrash2"
            :label="t('documentation.publish.unpublish')"
            class="!text-red-500 hover:!bg-red-500/10"
            :loading="loading"
            :disabled="loading"
            filled
            outline
            @click="showDeleteConfirmModal = true"
          />
        </div>
      </div>
    </template>
  </HoppSmartModal>

  <HoppSmartConfirmModal
    :show="showDeleteConfirmModal"
    :title="t('documentation.publish.unpublish_doc')"
    :confirm="t('action.unpublish')"
    :loading-state="loading"
    @hide-modal="showDeleteConfirmModal = false"
    @resolve="confirmDelete"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { platform } from "~/platform"

import IconTrash2 from "~icons/lucide/trash-2"

import {
  CreatePublishedDocsArgs,
  UpdatePublishedDocsArgs,
  WorkspaceType,
} from "~/helpers/backend/graphql"
import { useClipboard } from "@vueuse/core"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  collectionID: string
  collectionTitle: string
  workspaceType: WorkspaceType
  workspaceID: string
  mode?: "create" | "update" | "view"
  isFirstPublish?: boolean
  isAutoSyncLocked?: boolean
  publishedDocId?: string
  existingData?: {
    title: string
    version: string
    autoSync: boolean
    url: string
    environmentName?: string | null
    environmentID?: string | null
  }
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "publish", data: CreatePublishedDocsArgs): void
  (e: "update", id: string, data: UpdatePublishedDocsArgs): void
  (e: "published", url: string): void
  (e: "delete"): void
}>()

const publishTitle = ref(props.existingData?.title || props.collectionTitle)
const publishVersion = ref(props.existingData?.version || "latest")
const autoSync = ref(props.existingData?.autoSync ?? false)
const publishedUrl = ref<string | null>(props.existingData?.url || null)
const selectedEnvironmentID = ref<string | null>(
  props.existingData?.environmentID ?? null
)

const { copy } = useClipboard()

const showDeleteConfirmModal = ref(false)

// Initialize form data based on existingData or defaults
const initializeFormData = () => {
  if (props.existingData) {
    publishTitle.value = props.existingData.title
    publishVersion.value = props.existingData.version
    autoSync.value = props.existingData.autoSync
    publishedUrl.value = props.existingData.url
    selectedEnvironmentID.value = props.existingData.environmentID ?? null
  } else if (props.isFirstPublish) {
    publishTitle.value = props.collectionTitle
    publishVersion.value = "CURRENT"
    autoSync.value = true
    publishedUrl.value = null
    selectedEnvironmentID.value = null
  } else {
    publishTitle.value = props.collectionTitle
    publishVersion.value = ""
    autoSync.value = false
    publishedUrl.value = null
    selectedEnvironmentID.value = null
  }
}

// Watch for modal open/close
watch(
  [() => props.existingData, () => props.show],
  ([, isOpen]) => {
    if (isOpen) {
      initializeFormData()
    }
  },
  { immediate: true }
)

const modalTitle = computed(() => {
  if (props.mode === "update") return t("documentation.publish.update_title")
  if (props.mode === "view") return t("documentation.publish.view_title")
  return t("documentation.publish.title")
})

const canPublish = computed(() => {
  return publishTitle.value.trim().length > 0 && isValidVersion.value
})

const isValidVersion = computed(() => {
  const version = publishVersion.value.trim()
  const regex = /^[a-zA-Z0-9.-]+$/
  return version.length > 0 && regex.test(version)
})

const hasChanges = computed(() => {
  if (!props.existingData) return true

  return (
    publishTitle.value.trim() !== props.existingData.title ||
    publishVersion.value.trim() !== props.existingData.version ||
    autoSync.value !== props.existingData.autoSync ||
    selectedEnvironmentID.value !== (props.existingData.environmentID ?? null)
  )
})

const hideModal = () => {
  emit("hide-modal")
}

const handlePublish = () => {
  if (!canPublish.value) return

  const doc: CreatePublishedDocsArgs = {
    title: publishTitle.value.trim(),
    version: publishVersion.value.trim(),
    autoSync: autoSync.value,
    workspaceType: props.workspaceType,
    workspaceID: props.workspaceID,
    collectionID: props.collectionID,
    metadata: "{}",
    environmentID: selectedEnvironmentID.value || undefined,
  }

  emit("publish", doc)
}

const handleUpdate = () => {
  if (!canPublish.value || !props.publishedDocId) return

  const doc: UpdatePublishedDocsArgs = {
    title: publishTitle.value.trim(),
    version: publishVersion.value.trim(),
    autoSync: autoSync.value,
    metadata: "{}",
    environmentID: selectedEnvironmentID.value ?? null,
  }

  emit("update", props.publishedDocId, doc)
}

const copyUrl = () => {
  if (publishedUrl.value) {
    copy(publishedUrl.value)
    toast.success(t("documentation.publish.url_copied"))
  }
}

const viewPublished = () => {
  if (publishedUrl.value) {
    platform.kernelIO.openExternalLink({ url: publishedUrl.value })
  }
}

const confirmDelete = () => {
  emit("delete")
  showDeleteConfirmModal.value = false
}
</script>
