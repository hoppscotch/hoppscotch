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
import { TeamCollection } from "~/helpers/backend/graphql"
import { RESTOptionTabs } from "../http/RequestOptions.vue"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
    collection: HoppCollection<HoppRESTRequest> | TeamCollection
  }>(),
  {
    show: false,
    loadingState: false,
  }
)

const emit = defineEmits<{
  (e: "submit", name: string): void
  (e: "hide-modal"): void
}>()

const editableCollection = ref({
  ...props.collection,
  body: {
    contentType: null,
    body: null,
  },
  headers: [],
  auth: {
    authType: "none",
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
    if (!show) {
    }
  }
)

const saveEditedCollection = () => {
  console.log("new-coll", editableCollection.value)
}

// const addNewCollection = () => {
//   if (!editingName.value) {
//     toast.error(t("collection.invalid_name"))
//     return
//   }

// }

const hideModal = () => {
  emit("hide-modal")
}
</script>
