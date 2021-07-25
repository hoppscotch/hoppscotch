<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_collection") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelGqlEdit" class="font-semibold px-4 pb-4">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelGqlEdit"
          v-model="name"
          class="input"
          type="text"
          :placeholder="editingCollection.name"
          @keyup.enter="saveCollection"
        />
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="saveCollection" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import Vue from "vue"
import { editGraphqlCollection } from "~/newstore/collections"

export default Vue.extend({
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
        this.$toast.info(this.$t("invalid_collection_name").toString())
        return
      }
      const collectionUpdated = {
        ...this.$props.editingCollection,
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
