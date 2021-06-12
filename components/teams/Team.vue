<template>
  <div class="row-wrapper">
    <div>
      <button
        v-tooltip.right="team.myRole === 'OWNER' ? $t('edit') : ''"
        class="icon"
        @click="team.myRole === 'OWNER' ? $emit('edit-team') : ''"
      >
        <i class="material-icons">group</i>
        <span>{{ team.name }}</span>
      </button>
    </div>
    <v-popover>
      <button v-tooltip.left="$t('more')" class="tooltip-target icon">
        <i class="material-icons">more_vert</i>
      </button>
      <template slot="popover">
        <div v-if="team.myRole === 'OWNER'">
          <button v-close-popover class="icon" @click="$emit('edit-team')">
            <i class="material-icons">create</i>
            <span>{{ $t("edit") }}</span>
          </button>
        </div>
        <div v-if="team.myRole === 'OWNER'">
          <button v-close-popover class="icon" @click="deleteTeam">
            <i class="material-icons">delete</i>
            <span>{{ $t("delete") }}</span>
          </button>
        </div>
        <div>
          <button
            v-close-popover
            class="icon"
            :disabled="team.myRole === 'OWNER' && team.ownersCount == 1"
            @click="exitTeam"
          >
            <i class="material-icons">remove</i>
            <div
              v-tooltip.left="{
                content:
                  team.myRole === 'OWNER' && team.ownersCount == 1
                    ? $t('disable_exit')
                    : '',
              }"
            >
              <span>{{ $t("exit") }}</span>
            </div>
          </button>
        </div>
      </template>
    </v-popover>
  </div>
</template>

<script>
import * as teamUtils from "~/helpers/teams/utils"

export default {
  props: {
    team: { type: Object, default: () => {} },
    teamID: { type: String, default: null },
  },
  methods: {
    deleteTeam() {
      if (!confirm("Are you sure you want to remove this team?")) return
      // Call to the graphql mutation
      teamUtils
        .deleteTeam(this.$apollo, this.teamID)
        .then(() => {
          // Result
          this.$toast.success(this.$t("new_team_created"), {
            icon: "done",
          })
        })
        .catch((error) => {
          // Error
          this.$toast.error(this.$t("error_occurred"), {
            icon: "done",
          })
          console.error(error)
        })
    },
    exitTeam() {
      if (!confirm("Are you sure you want to exit this team?")) return
      teamUtils
        .exitTeam(this.$apollo, this.teamID)
        .then(() => {
          // Result
          this.$toast.success(this.$t("team_exited"), {
            icon: "done",
          })
        })
        .catch((error) => {
          // Error
          this.$toast.error(this.$t("error_occurred"), {
            icon: "error",
          })
          console.error(error)
        })
    },
  },
}
</script>
