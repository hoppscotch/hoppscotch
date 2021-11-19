<template>
  <SmartModal
    v-if="show"
    :title="`${$t('collection.edit')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelGqlEdit"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="saveCollection"
        />
        <label for="selectLabelGqlEdit">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${$t('action.save')}`"
          @click.native="saveCollection"
        />
        <ButtonSecondary
          :label="`${$t('action.cancel')}`"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { editGraphqlCollection } from "~/newstore/collections"

export default defineComponent({
  props: {
    show: Boolean,
    editingCollection: { type: Object, default: () => {} },
    editingCollectionIndex: { type: Number, default: null },
  },
  data() {
    return {
      name: null as string | null,
    }
  },
  methods: {
    saveCollection() {
      if (!this.name) {
        this.$toast.error(`${this.$t("collection.invalid_name")}`)
        return
      }
      const collectionUpdated = {
        ...(this.editingCollection as any),
        name: this.name,
      }

      editGraphqlCollection(this.editingCollectionIndex, collectionUpdated)
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
