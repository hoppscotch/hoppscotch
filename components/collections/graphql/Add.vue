<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("new_collection") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template #body>
      <div class="px-2 flex flex-col">
        <label for="selectLabelGqlAdd" class="px-4 font-semibold pb-4 text-xs">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelGqlAdd"
          v-model="name"
          class="input"
          type="text"
          :placeholder="$t('my_new_collection')"
          @keyup.enter="addNewCollection"
        />
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
        this.$toast.info(this.$t("invalid_collection_name").toString())
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
