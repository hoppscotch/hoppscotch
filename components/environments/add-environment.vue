<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="row-wrapper">
            <h3 class="title">{{ $t("new_environment") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <closeIcon class="material-icons" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <ul>
        <li>
          <input
            type="text"
            v-model="name"
            :placeholder="$t('my_new_environment')"
            @keyup.enter="addNewEnvironment"
          />
        </li>
      </ul>
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
  </modal>
</template>

<script>
import { fb } from "~/helpers/fb"
import closeIcon from "~/static/icons/close-24px.svg?inline"

export default {
  components: {
    closeIcon,
  },
  props: {
    show: Boolean,
  },
  data() {
    return {
      name: undefined,
    }
  },
  methods: {
    syncEnvironments() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[1].value) {
          fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
        }
      }
    },
    addNewEnvironment() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_environment_name"))
        return
      }
      let newEnvironment = [
        {
          name: this.$data.name,
          variables: [],
        },
      ]
      this.$store.commit("postwoman/importAddEnvironments", {
        environments: newEnvironment,
        confirmation: "Environment added",
      })
      this.$emit("hide-modal")
      this.syncEnvironments()
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$data.name = undefined
    },
  },
}
</script>
