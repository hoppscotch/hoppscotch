<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("new_environment") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        id="selectLabel"
        v-model="name"
        type="text"
        :placeholder="$t('my_new_environment')"
        @keyup.enter="addNewEnvironment"
      />
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="addNewEnvironment">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script lang="ts">
import Vue from "vue"
import { createEnvironment } from "~/newstore/environments"

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
    addNewEnvironment() {
      if (!this.name) {
        this.$toast.info(this.$t("invalid_environment_name").toString())
        return
      }
      createEnvironment(this.name)
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
