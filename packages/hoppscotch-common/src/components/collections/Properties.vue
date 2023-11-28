<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('collection.properties')"
    :full-width-body="true"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartTabs
        v-model="selectedOptionTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10 !-py-4"
        render-inactive-tabs
      >
        <HoppSmartTab :id="'headers'" :label="`${t('tab.headers')}`">
          <HttpHeaders
            v-model="editableCollection"
            :is-collection-property="true"
            @change-tab="changeOptionTab"
          />
          <AppBanner
            :banner="{
              type: 'info',
              alternateText: 'This is an alternate text',
            }"
            class="sticky bottom-0 z-10"
          >
            <span>
              {{ t("helpers.collection_properties_header") }}
              <a href="hopp.sh" target="_blank" class="underline">{{
                t("action.learn_more")
              }}</a>
            </span>
          </AppBanner>
        </HoppSmartTab>
        <HoppSmartTab
          :id="'authorization'"
          :label="`${t('tab.authorization')}`"
        >
          <HttpAuthorization
            v-model="editableCollection.auth"
            :is-collection-property="true"
            :is-root-collection="editingProperties.isRootCollection"
            :inherited-properties="editingProperties.inheritedProperties"
          />
          <AppBanner
            :banner="{
              type: 'info',
              alternateText: 'This is an alternate text',
            }"
          >
            <span>
              {{ t("helpers.collection_properties_authorization") }}
              <a href="hopp.sh" target="_blank" class="underline">{{
                t("action.learn_more")
              }}</a>
            </span>
          </AppBanner>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="saveEditedCollection"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { watch, ref } from "vue"
import { useI18n } from "@composables/i18n"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { RESTOptionTabs } from "../http/RequestOptions.vue"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { clone } from "lodash-es"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

const t = useI18n()

type EditingProperties = {
  collection: HoppCollection<HoppRESTRequest> | TeamCollection | null
  isRootCollection: boolean
  path: string
  inheritedProperties: HoppInheritedProperty | null
}

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
    editingProperties: EditingProperties | null
  }>(),
  {
    show: false,
    loadingState: false,
    editingProperties: null,
  }
)

const emit = defineEmits<{
  (e: "set-collection-properties", newCollection: any): void
  (e: "hide-modal"): void
}>()

const editableCollection = ref({
  body: {
    contentType: null,
    body: null,
  },
  headers: [],
  auth: {
    authType: "inherit",
    authActive: false,
  },
}) as any

const selectedOptionTab = ref("headers")

const changeOptionTab = (tab: RESTOptionTabs) => {
  selectedOptionTab.value = tab
}

watch(
  () => props.show,
  (show) => {
    if (show && props.editingProperties?.collection) {
      editableCollection.value.auth = clone(
        props.editingProperties.collection.auth
      )
      editableCollection.value.headers = clone(
        props.editingProperties.collection.headers
      )
    } else {
      editableCollection.value = {
        body: {
          contentType: null,
          body: null,
        },
        headers: [],
        auth: {
          authType: "inherit",
          authActive: false,
        },
      }
    }
  }
)

const saveEditedCollection = () => {
  if (!props.editingProperties) return
  const finalCollection = clone(editableCollection.value)
  delete finalCollection.body
  const collection = {
    path: props.editingProperties.path,
    collection: {
      ...props.editingProperties.collection,
      ...finalCollection,
    },
    isRootCollection: props.editingProperties.isRootCollection,
  }
  emit("set-collection-properties", collection)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
