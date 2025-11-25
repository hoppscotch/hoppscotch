<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('collection.properties')"
    :full-width-body="true"
    styles="sm:max-w-3xl"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartTabs
        v-model="activeTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10 !-py-4"
        render-inactive-tabs
      >
        <HoppSmartTab
          v-if="hasTeamWriteAccess"
          id="headers"
          :label="`${t('tab.headers')}`"
        >
          <HttpHeaders
            v-model="editableCollection"
            :is-collection-property="true"
            @change-tab="changeOptionTab"
          />
          <div
            class="bg-bannerInfo px-4 py-2 flex items-center sticky bottom-0"
          >
            <icon-lucide-info class="svg-icons mr-2" />
            {{ t("helpers.collection_properties_header") }}
          </div>
        </HoppSmartTab>

        <HoppSmartTab
          v-if="hasTeamWriteAccess"
          id="authorization"
          :label="`${t('tab.authorization')}`"
        >
          <HttpAuthorization
            v-model="editableCollection.auth"
            :is-collection-property="true"
            :is-root-collection="editingProperties.isRootCollection"
            :inherited-properties="editingProperties.inheritedProperties"
            :source="source"
          />
          <div
            class="bg-bannerInfo px-4 py-2 flex items-center sticky bottom-0"
          >
            <icon-lucide-info class="svg-icons mr-2" />
            {{ t("helpers.collection_properties_authorization") }}
          </div>
        </HoppSmartTab>

        <!-- Collection variables is only available for REST collections for now -->
        <HoppSmartTab
          v-if="source === 'REST'"
          id="variables"
          :label="`${t('tab.variables')}`"
        >
          <CollectionsVariables
            v-model="editableCollection.variables"
            :inherited-properties="editingProperties.inheritedProperties"
            :has-team-write-access="hasTeamWriteAccess"
          />
        </HoppSmartTab>

        <HoppSmartTab
          v-if="showDetails"
          :id="'details'"
          :label="t('collection.details')"
        >
          <div
            class="flex flex-shrink-0 items-center justify-between border-b border-dividerLight bg-primary pl-4"
          >
            <span>{{ t("collection_runner.collection_id") }}</span>

            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/documentation/clients/cli/overview#running-collections-present-on-the-api-client"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
          </div>

          <div class="p-4">
            <div
              class="flex items-center justify-between py-2 px-4 rounded-md bg-primaryLight select-text"
            >
              <div class="text-secondaryDark">
                {{ editingProperties.path }}
              </div>

              <HoppButtonSecondary
                filled
                :icon="copyIcon"
                @click="copyCollectionID"
              />
            </div>
          </div>

          <div
            class="bg-bannerInfo px-4 py-2 flex items-center sticky bottom-0"
          >
            <icon-lucide-info class="svg-icons mr-2" />
            {{ t("collection_runner.cli_collection_id_description") }}
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>
    <template #footer>
      <div class="flex gap-x-2">
        <HoppButtonPrimary
          v-if="activeTabIsDetails"
          :label="t('action.copy')"
          :icon="copyIcon"
          outline
          filled
          @click="copyCollectionID"
        />
        <HoppButtonPrimary
          v-else
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="saveEditedCollection"
        />

        <HoppButtonSecondary
          :label="activeTabIsDetails ? t('action.close') : t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { refAutoReset, useVModel } from "@vueuse/core"
import { clone } from "lodash-es"
import { useI18n } from "@composables/i18n"
import { useToast } from "~/composables/toast"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useService } from "dioc/vue"

import {
  HoppCollection,
  HoppCollectionVariable,
  HoppRESTAuth,
  HoppGQLAuth,
  HoppRESTHeaders,
  GQLHeader,
} from "@hoppscotch/data"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { PersistenceService } from "~/services/persistence"

import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconHelpCircle from "~icons/lucide/help-circle"
import { RESTOptionTabs } from "../http/RequestOptions.vue"

const persistenceService = useService(PersistenceService)
const t = useI18n()
const toast = useToast()

export type EditingProperties = {
  collection: Partial<HoppCollection> | null
  isRootCollection: boolean
  path: string
  inheritedProperties?: HoppInheritedProperty
}
type HoppCollectionAuth = HoppRESTAuth | HoppGQLAuth
type HoppCollectionHeaders = HoppRESTHeaders | GQLHeader[]

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState?: boolean
    editingProperties: EditingProperties
    source: "REST" | "GraphQL"
    modelValue: string
    showDetails?: boolean
    hasTeamWriteAccess?: boolean
  }>(),
  {
    show: false,
    loadingState: false,
    showDetails: false,
    hasTeamWriteAccess: true,
  }
)

const emit = defineEmits<{
  (
    e: "set-collection-properties",
    newCollection: Omit<EditingProperties, "inheritedProperties">
  ): void
  (e: "hide-modal"): void
  (e: "update:modelValue"): void
}>()

const editableCollection = ref<{
  headers: HoppCollectionHeaders
  auth: HoppCollectionAuth
  variables: HoppCollectionVariable[]
}>({
  headers: [],
  auth: { authType: "inherit", authActive: false },
  variables: [],
})

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)
const activeTab = useVModel(props, "modelValue", emit)

const activeTabIsDetails = computed(() => activeTab.value === "details")

const persistUnsavedChanges = async (
  updated: typeof editableCollection.value
) => {
  if (!props.show) return
  await persistenceService.setLocalConfig(
    "unsaved_collection_properties",
    JSON.stringify({
      collection: updated,
      isRootCollection: props.editingProperties.isRootCollection ?? false,
      path: props.editingProperties.path,
      inheritedProperties: props.editingProperties.inheritedProperties,
    })
  )
}

const handleModalVisibility = async (show: boolean) => {
  enforceTabAccessRules()

  if (show && props.editingProperties.collection) {
    loadEditableCollection()
  } else {
    resetEditableCollection()
    await persistenceService.removeLocalConfig("unsaved_collection_properties")
  }
}

const enforceTabAccessRules = () => {
  // `Details` tab doesn't exist for personal workspace, hence switching to the `Headers` tab
  // The modal can appear empty while switching from a team workspace with `Details` as the active tab
  if (activeTab.value === "details" && !props.showDetails)
    activeTab.value = "headers"
  // If the user doesn't have write access to the team, switch to `Variables` tab
  // when the `Headers` or `Authorization` tab is active
  if (
    !props.hasTeamWriteAccess &&
    ["headers", "authorization"].includes(activeTab.value)
  )
    activeTab.value = "variables"
}

const loadEditableCollection = () => {
  editableCollection.value = {
    auth: clone(props.editingProperties.collection!.auth as HoppCollectionAuth),
    headers: clone(
      props.editingProperties.collection!.headers as HoppCollectionHeaders
    ),
    variables: clone(props.editingProperties.collection!.variables || []),
  }
}

const resetEditableCollection = () => {
  editableCollection.value = {
    headers: [],
    auth: { authType: "inherit", authActive: false },
    variables: [],
  }
}

const saveEditedCollection = async () => {
  if (!props.editingProperties) return
  emit("set-collection-properties", {
    path: props.editingProperties.path,
    collection: {
      ...props.editingProperties.collection,
      ...clone(editableCollection.value),
    },
    isRootCollection: props.editingProperties.isRootCollection,
  } as EditingProperties)
  await persistenceService.removeLocalConfig("unsaved_collection_properties")
}

watch(editableCollection, persistUnsavedChanges, { deep: true })
watch(() => props.show, handleModalVisibility)

const hideModal = async () => {
  await persistenceService.removeLocalConfig("unsaved_collection_properties")
  emit("hide-modal")
}

const changeOptionTab = (tab: RESTOptionTabs) => {
  activeTab.value = tab
}

const copyCollectionID = () => {
  copyToClipboard(props.editingProperties.path)
  copyIcon.value = IconCheck
  toast.success(t("state.copied_to_clipboard"))
}
</script>
