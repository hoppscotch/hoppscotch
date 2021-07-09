<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("new_team") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template #body>
      <div class="px-2 flex flex-col">
        <label for="selectLabelTeamAdd" class="px-4 font-semibold pb-4 text-xs">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelTeamAdd"
          v-model="name"
          class="input"
          type="text"
          :placeholder="$t('my_new_team')"
          @keyup.enter="addNewTeam"
        />
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="addNewTeam" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import * as teamUtils from "~/helpers/teams/utils"

export default {
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
      if (name != null && name.replace(/\s/g, "").length < 6) {
        this.$toast.error(this.$t("string_length_insufficient"), {
          icon: "error",
        })
        return
      }
      // Call to the graphql mutation
      teamUtils
        .createTeam(this.$apollo, name)
        .then(() => {
          // Result
          this.hideModal()
        })
        .catch((error) => {
          // Error
          console.error(error)
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
}
</script>
