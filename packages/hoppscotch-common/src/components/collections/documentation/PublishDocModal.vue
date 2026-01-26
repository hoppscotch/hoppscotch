<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="modalTitle"
    styles="sm:max-w-2xl"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col space-y-6">
        <!-- Title Input -->
        <div>
          <HoppSmartInput
            v-model="publishTitle"
            label="Title"
            type="text"
            :readonly="mode === 'view'"
            :class="{ 'opacity-60 cursor-not-allowed': mode === 'view' }"
            input-styles="floating-input"
          />
        </div>

        <!-- Additional Fields (will be enabled in the future) -->
        <!-- Version Input -->
        <!-- <div>
          <label class="block text-sm font-medium text-secondaryDark mb-2">
            {{ t("documentation.publish.doc_version") }}
          </label>
          <input
            v-model="publishVersion"
            type="text"
            :readonly="mode === 'view'"
            class="w-full px-3 py-2 border border-divider rounded bg-primary text-secondaryDark focus:outline-none focus:border-accent"
            :class="{ 'opacity-60 cursor-not-allowed': mode === 'view' }"
            placeholder="1.0.0"
          />
        </div> -->

        <!-- Auto-sync Toggle -->
        <!-- <div class="flex items-start space-x-3">
          <input
            id="auto-sync"
            v-model="autoSync"
            type="checkbox"
            :disabled="mode === 'view'"
            class="mt-1"
            :class="{ 'opacity-60 cursor-not-allowed': mode === 'view' }"
          />
          <div>
            <label
              for="auto-sync"
              class="text-sm font-medium text-secondaryDark cursor-pointer"
            >
              {{ t("documentation.publish.auto_sync") }}
            </label>
            <p class="text-xs text-secondaryLight mt-1">
              {{ t("documentation.publish.auto_sync_description") }}
            </p>
          </div>
        </div> -->

        <!-- Published URL (shown after publishing or in update/view mode) -->
        <div v-if="publishedUrl || mode !== 'create'" class="space-y-2">
          <div class="flex items-center space-x-2">
            <HoppSmartInput
              v-model="publishedUrl"
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
              :icon="copyIcon"
              outline
              @click="copyUrl"
            />
            <HoppButtonPrimary
              v-if="(mode === 'view' || mode === 'update') && publishedUrl"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('documentation.publish.open_published_doc')"
              :label="t('action.open')"
              :icon="IconExternalLink"
              @click="viewPublished"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center flex-1">
        <div class="flex items-center w-full space-x-2">
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
            :label="t('action.cancel')"
            outline
            filled
            @click="hideModal"
          />
        </div>
        <div class="flex">
          <HoppButtonSecondary
            v-if="mode === 'update'"
            :icon="IconTrash2"
            :label="t('documentation.publish.unpublish')"
            class="!text-red-500"
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
import { ref, computed, watch, markRaw } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { platform } from "~/platform"

import IconCopy from "~icons/lucide/copy"
import IconExternalLink from "~icons/lucide/external-link"
import IconCheck from "~icons/lucide/check"
import IconTrash2 from "~icons/lucide/trash-2"

import {
  CreatePublishedDocsArgs,
  UpdatePublishedDocsArgs,
  WorkspaceType,
} from "~/helpers/backend/graphql"
import { refAutoReset, useClipboard } from "@vueuse/core"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  collectionID: string
  collectionTitle: string
  workspaceType: WorkspaceType
  workspaceID: string
  mode?: "create" | "update" | "view"
  publishedDocId?: string
  existingData?: {
    title: string
    version: string
    autoSync: boolean
    url: string
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
const autoSync = ref(props.existingData?.autoSync ?? true)
const publishedUrl = ref<string | null>(props.existingData?.url || null)

const copyIcon = refAutoReset(markRaw(IconCopy), 3000)
const { copy } = useClipboard()

const showDeleteConfirmModal = ref(false)

// Initialize form data based on existingData or defaults
const initializeFormData = () => {
  if (props.existingData) {
    publishTitle.value = props.existingData.title
    publishVersion.value = props.existingData.version
    autoSync.value = props.existingData.autoSync
    publishedUrl.value = props.existingData.url
  } else {
    publishTitle.value = props.collectionTitle
    publishVersion.value = "1.0.0"
    autoSync.value = true
    publishedUrl.value = null
  }
}

// Watch for changes to existingData or modal visibility to update
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
  return publishTitle.value.trim().length > 0
})

const hasChanges = computed(() => {
  if (!props.existingData) return true

  return (
    publishTitle.value.trim() !== props.existingData.title ||
    publishVersion.value.trim() !== props.existingData.version ||
    autoSync.value !== props.existingData.autoSync
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
  }

  emit("update", props.publishedDocId, doc)
}

const copyUrl = () => {
  if (publishedUrl.value) {
    copyIcon.value = markRaw(IconCheck)
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
