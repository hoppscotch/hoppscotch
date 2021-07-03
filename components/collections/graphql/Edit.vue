<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_collection") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        id="selectLabel"
        v-model="name"
        class="input"
        type="text"
        :placeholder="editingCollection.name"
        @keyup.enter="saveCollection"
      />
    </template>
    <template #footer>
      <span></span>
      <span>
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
        <ButtonPrimary :label="$t('save')" @click.native="saveCollection" />
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
