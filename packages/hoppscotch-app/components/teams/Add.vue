<template>
  <SmartModal v-if="show" :title="$t('team.new')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelTeamAdd"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addNewTeam"
        />
        <label for="selectLabelTeamAdd">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('action.save')" @click.native="addNewTeam" />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import * as teamUtils from "~/helpers/teams/utils"

export default defineComponent({
  props: {
    show: Boolean,
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    addNewTeam() {
      // We save the user input in case of an error
      const name = this.name
      // We clear it early to give the UI a snappy feel
      this.name = ""
      if (!name) {
        this.$toast.error(this.$t("empty.team_name"), {
          icon: "error_outline",
        })
        return
      }
      if (name !== null && name.replace(/\s/g, "").length < 6) {
        this.$toast.error(this.$t("team.name_length_insufficient"), {
          icon: "error_outline",
        })
        return
      }
      // Call to the graphql mutation
      teamUtils
        .createTeam(this.$apollo, name)
        .then(() => {
          this.hideModal()
        })
        .catch((e) => {
          console.error(e)
          // We restore the initial user input
          this.name = name
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
