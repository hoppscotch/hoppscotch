<template>
  <div class="border border-dividerLight rounded flex flex-1 items-end">
    <div class="flex flex-1 items-start">
      <div class="p-4">
        <label
          class="cursor-pointer transition hover:text-secondaryDark"
          @click="team.myRole === 'OWNER' ? $emit('edit-team') : ''"
        >
          {{ team.name || $t("state.nothing_found") }}
        </label>
        <div class="flex -space-x-1 mt-2 overflow-hidden">
          <img
            v-for="(member, index) in team.members"
            :key="`member-${index}`"
            v-tippy="{ theme: 'tooltip' }"
            :title="member.user.displayName"
            :src="member.user.photoURL"
            :alt="member.user.displayName"
            class="rounded-full h-5 ring-primary ring-2 w-5 inline-block"
          />
        </div>
      </div>
    </div>
    <span>
      <tippy ref="options" interactive trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('action.more')"
            icon="more_vert"
          />
        </template>
        <SmartItem
          v-if="team.myRole === 'OWNER'"
          icon="create"
          :label="$t('action.edit')"
          @click.native="
            $emit('edit-team')
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          v-if="team.myRole === 'OWNER'"
          icon="delete"
          color="red"
          :label="$t('action.delete')"
          @click.native="
            deleteTeam()
            $refs.options.tippy().hide()
          "
        />
        <span
          v-tippy="{ theme: 'tooltip' }"
          :title="
            team.myRole === 'OWNER' && team.ownersCount == 1
              ? $t('team.exit_disabled')
              : ''
          "
        >
          <SmartItem
            :disabled="team.myRole === 'OWNER' && team.ownersCount == 1"
            icon="remove"
            :label="$t('team.exit')"
            @click.native="
              exitTeam()
              $refs.options.tippy().hide()
            "
          />
        </span>
      </tippy>
    </span>
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
      if (!confirm(this.$t("confirm.remove_team"))) return
      // Call to the graphql mutation
      teamUtils
        .deleteTeam(this.$apollo, this.teamID)
        .then(() => {
          this.$toast.success(this.$t("team.deleted"), {
            icon: "done",
          })
        })
        .catch((e) => {
          this.$toast.error(this.$t("error.something_went_wrong"), {
            icon: "error_outline",
          })
          console.error(e)
        })
    },
    exitTeam() {
      if (!confirm("Are you sure you want to exit this team?")) return
      teamUtils
        .exitTeam(this.$apollo, this.teamID)
        .then(() => {
          this.$toast.success(this.$t("team.left"), {
            icon: "done",
          })
        })
        .catch((e) => {
          this.$toast.error(this.$t("error.something_went_wrong"), {
            icon: "error_outline",
          })
          console.error(e)
        })
    },
  },
}
</script>
