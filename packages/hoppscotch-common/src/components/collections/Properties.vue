<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('collection.properties')"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartTabs
        v-model="selectedOptionTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary  z-10"
        render-inactive-tabs
      >
        <HoppSmartTab :id="'headers'" :label="`${t('tab.headers')}`">
          <HttpHeaders
            v-model="editableCollection"
            @change-tab="changeOptionTab"
          />
          <AppBanner
            :banner="{
              type: 'info',
              alternateText: 'This is an alternate text',
            }"
          >
            <span>
              This header will be set for every request in this collection.
              <a href="hopp.sh" class="underline">Learn More</a>
            </span>
          </AppBanner>
        </HoppSmartTab>
        <HoppSmartTab
          :id="'authorization'"
          :label="`${t('tab.authorization')}`"
        >
          <HttpAuthorization v-model="editableCollection.auth" />
          <AppBanner
            :banner="{
              type: 'info',
              alternateText: 'This is an alternate text',
            }"
          >
            <span>
              This authorization will be set for every request in this
              collection.
              <a href="hopp.sh" class="underline">Learn More</a>
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
})

type Tab = "headers" | "authorization"

const selectedOptionTab = ref("headers")

const changeOptionTab = (tab: Tab) => {
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
