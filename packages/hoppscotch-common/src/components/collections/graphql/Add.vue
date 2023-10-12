<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('collection.new')}`"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="name"
        placeholder=" "
        input-styles="floating-input"
        :label="t('action.label')"
        @submit="addNewCollection"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="addNewCollection"
        />
        <HoppButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { HoppGQLRequest, makeCollection } from "@hoppscotch/data"
import { addGraphqlCollection } from "~/newstore/collections"
import { platform } from "~/platform"

export default defineComponent({
  props: {
    show: Boolean,
  },
  emits: ["hide-modal"],
  setup() {
    return {
      toast: useToast(),
      t: useI18n(),
    }
  },
  data() {
    return {
      name: null as string | null,
    }
  },
  methods: {
    addNewCollection() {
      if (!this.name) {
        this.toast.error(`${this.t("collection.invalid_name")}`)
        return
      }

      addGraphqlCollection(
        makeCollection<HoppGQLRequest>({
          name: this.name,
          folders: [],
          requests: [],
        })
      )

      this.hideModal()

      platform.analytics?.logEvent({
        type: "HOPP_CREATE_COLLECTION",
        isRootCollection: true,
        platform: "gql",
        workspaceType: "personal",
      })
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
