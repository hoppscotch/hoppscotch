<template>
  <SmartModal v-if="show" :title="$t('new_environment')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelEnvAdd"
          v-model="name"
          class="input floating-input"
          placeholder=" "
          type="text"
          @keyup.enter="addNewEnvironment"
        />
        <label for="selectLabelEnvAdd">
          {{ $t("label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="addNewEnvironment" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
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
