<template>
  <div class="flex flex-1">
    <div>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        title="team.myRole === 'OWNER' ? $t('edit') : ''"
        icon="group"
        :label="team.name"
        @click.native="team.myRole === 'OWNER' ? $emit('edit-team') : ''"
      />
    </div>
    <tippy ref="options" tabindex="-1" trigger="click" theme="popover" arrow>
      <template #trigger>
        <TabPrimary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('more')"
          icon="more_vert"
        />
      </template>
      <SmartItem
        v-if="team.myRole === 'OWNER'"
        icon="create"
        :label="$t('edit')"
        @click.native="
          $emit('edit-team')
          $refs.options.tippy().hide()
        "
      />
      <SmartItem
        v-if="team.myRole === 'OWNER'"
        icon="delete"
        :label="$t('delete')"
        @click.native="
          deleteTeam
          $refs.options.tippy().hide()
        "
      />
      <SmartItem
        v-tippy="{ theme: 'tooltip' }"
        :title="
          team.myRole === 'OWNER' && team.ownersCount == 1
            ? $t('disable_exit')
            : ''
        "
        :disabled="team.myRole === 'OWNER' && team.ownersCount == 1"
        icon="remove"
        :label="$t('exit')"
        @click.native="
          exitTeam
          $refs.options.tippy().hide()
        "
      />
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
