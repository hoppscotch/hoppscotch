<template>
  <div class="row-wrapper">
    <div>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        title="team.myRole === 'OWNER' ? $t('edit') : ''"
        icon="group"
        :label="team.name"
        @click.native="team.myRole === 'OWNER' ? $emit('edit-team') : ''"
      />
    </div>
    <tippy tabindex="-1" trigger="click" theme="popover" arrow>
      <template #trigger>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('more')"
          icon="more_vert"
        />
      </template>
      <div v-if="team.myRole === 'OWNER'">
        <ButtonSecondary
          icon="create"
          :label="$t('edit')"
          @click.native="$emit('edit-team')"
        />
      </div>
      <div v-if="team.myRole === 'OWNER'">
        <ButtonSecondary
          icon="delete"
          :label="$t('delete')"
          @click.native="deleteTeam"
        />
      </div>
      <div>
        <ButtonSecondary
          :disabled="team.myRole === 'OWNER' && team.ownersCount == 1"
          icon="remove"
          @click.native="exitTeam"
        />
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
