<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("new_environment") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="px-2 flex flex-col">
        <label for="selectLabelEnvAdd" class="px-4 font-semibold pb-4 text-xs">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelEnvAdd"
          v-model="name"
          class="input"
          type="text"
          :placeholder="$t('my_new_environment')"
          @keyup.enter="addNewEnvironment"
        />
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
