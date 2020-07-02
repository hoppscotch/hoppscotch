<template>
  <div class="flex-wrap">
    <div>
      <button class="icon" v-tooltip.right="$t('use_team')">
        <i class="material-icons">insert_drive_file</i>
        <span>{{ team.name }}</span>
      </button>
    </div>
    <v-popover>
      <button class="tooltip-target icon" v-tooltip.left="$t('more')">
        <i class="material-icons">more_vert</i>
      </button>
      <template slot="popover">
        <div>
          <button class="icon" @click="$emit('edit-team')" v-close-popover>
            <i class="material-icons">create</i>
            <span>{{ $t("edit") }}</span>
          </button>
        </div>
        <div>
          <button class="icon" @click="removeTeam" v-close-popover>
            <i class="material-icons">delete</i>
            <span>{{ $t("delete") }}</span>
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
import { fb } from "~/helpers/fb"

export default {
  props: {
    team: Object,
    teamIndex: Number,
  },
  methods: {
    syncTeams() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[3].value) {
          fb.writeTeams(JSON.parse(JSON.stringify(this.$store.state.postwoman.teams)))
        }
      }
    },
    removeTeam() {
      if (!confirm("Are you sure you want to remove this team?")) return
      this.$store.commit("postwoman/removeTeam", this.teamIndex)
      this.syncTeams()
    },
  },
}
</script>
