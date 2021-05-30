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

<script>
import { fb } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"

export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      name: null,
    }
  },
  subscriptions() {
    return {
      SYNC_ENVIRONMENTS: getSettingSubject("syncEnvironments"),
    }
  },
  methods: {
    syncEnvironments() {
      if (fb.currentUser !== null && this.SYNC_ENVIRONMENTS) {
        fb.writeEnvironments(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.environments))
        )
      }
    },
    addNewEnvironment() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_environment_name"))
        return
      }
      const newEnvironment = [
        {
          name: this.$data.name,
          variables: [],
        },
      ]
      this.$store.commit("postwoman/importAddEnvironments", {
        environments: newEnvironment,
        confirmation: "Environment added",
      })
      this.syncEnvironments()
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
}
</script>
