<template>
  <div class="row-wrapper">
    <div>
      <button class="icon" v-tooltip.right="$t('use_team')">
        <i class="material-icons">group</i>
        <span>{{ team.name }}</span>
      </button>
    </div>
    <v-popover>
      <button class="tooltip-target icon" v-tooltip.left="$t('more')">
        <i class="material-icons">more_vert</i>
      </button>
      <template slot="popover">
        <div v-if="team.myRole === 'OWNER'">
          <button class="icon" @click="$emit('edit-team')" v-close-popover>
            <i class="material-icons">create</i>
            <span>{{ $t("edit") }}</span>
          </button>
        </div>
        <div v-if="team.myRole === 'OWNER'">
          <button class="icon" @click="deleteTeam" v-close-popover>
            <i class="material-icons">delete</i>
            <span>{{ $t("delete") }}</span>
          </button>
        </div>
        <div>
          <button
            class="icon"
            @click="exitTeam"
            v-close-popover
            :disabled="!(team.myRole === 'OWNER' && team.ownersCount == 1)"
          >
            <i class="material-icons">remove</i>
            <div
              v-tooltip.left="{
                content:
                  team.myRole === 'OWNER' && team.ownersCount == 1 ? null : $t('disable_exit'),
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

<style scoped lang="scss">
ul {
  display: flex;
  flex-direction: column;
}

ul li {
  display: flex;
  padding-left: 16px;
  border-left: 1px solid var(--brd-color);
}
</style>

<script>
import team_utils from "~/helpers/teams/utils"

export default {
  props: {
    team: Object,
    teamID: String,
  },
  methods: {
    deleteTeam() {
      if (!confirm("Are you sure you want to remove this team?")) return
      console.log("deleteTeam", this.teamID)
      // Call to the graphql mutation
      team_utils
        .deleteTeam(this.$apollo, this.teamID)
        .then((data) => {
          // Result
          this.$toast.success(this.$t("new_team_created"), {
            icon: "done",
          })
          console.log(data)
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
      console.log("leaveTeam", this.teamID)
      team_utils
        .exitTeam(this.$apollo, this.teamID)
        .then((data) => {
          // Result
          this.$toast.success(this.$t("team_exited"), {
            icon: "done",
          })
          console.log(data)
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
