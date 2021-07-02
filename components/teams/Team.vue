<template>
  <div class="row-wrapper">
    <div>
      <button
        v-tippy="{ theme: 'tooltip' }"
        title="team.myRole === 'OWNER' ? $t('edit') : ''"
        class="icon button"
        @click="team.myRole === 'OWNER' ? $emit('edit-team') : ''"
      >
        <i class="material-icons">group</i>
        <span>{{ team.name }}</span>
      </button>
    </div>
    <tippy trigger="click" theme="popover" arrow>
      <template #trigger>
        <button
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('more')"
          class="tooltip-target icon button"
        >
          <i class="material-icons">more_vert</i>
        </button>
      </template>
      <div v-if="team.myRole === 'OWNER'">
        <button class="icon button" @click="$emit('edit-team')">
          <i class="material-icons">create</i>
          <span>{{ $t("edit") }}</span>
        </button>
      </div>
      <div v-if="team.myRole === 'OWNER'">
        <button class="icon button" @click="deleteTeam">
          <i class="material-icons">delete</i>
          <span>{{ $t("delete") }}</span>
        </button>
      </div>
      <div>
        <button
          class="icon button"
          :disabled="team.myRole === 'OWNER' && team.ownersCount == 1"
          @click="exitTeam"
        >
          <i class="material-icons">remove</i>
          <div
            v-tippy="{ theme: 'tooltip' }"
            title="{
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
    </tippy>
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
