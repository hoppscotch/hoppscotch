<template>
  <SmartModal v-if="show" :title="$t('collection.new')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelGqlAdd"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          @keyup.enter="addNewCollection"
        />
        <label for="selectLabelGqlAdd">
          {{ $t("label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="addNewCollection" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import Vue from "vue"
import { addGraphqlCollection } from "~/newstore/collections"

export default Vue.extend({
  props: {
    show: Boolean,
  },
  data() {
    return {
      name: null as string | null,
    }
  },
  methods: {
    addNewCollection() {
      if (!this.name) {
        this.$toast.info(this.$t("collection.invalid_name").toString())
        return
      }

      addGraphqlCollection({
        name: this.name,
        folders: [],
        requests: [],
      })

      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
