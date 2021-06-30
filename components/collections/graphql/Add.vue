<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("new_collection") }}</h3>
      <div>
        <button class="icon button" @click="hideModal">
          <i class="material-icons">close</i>
        </button>
      </div>
    </template>
    <template #body>
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        id="selectLabel"
        v-model="name"
        class="input"
        type="text"
        :placeholder="$t('my_new_collection')"
        @keyup.enter="addNewCollection"
      />
    </template>
    <template #footer>
      <span></span>
      <span>
        <button class="icon button" @click="hideModal">
          {{ $t("cancel") }}
        </button>
        <button class="icon button primary" @click="addNewCollection">
          {{ $t("save") }}
        </button>
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
