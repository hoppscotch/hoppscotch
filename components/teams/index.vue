<template>
  <pw-section class="green" icon="history" :label="$t('teams')" ref="teams">
    <addTeam :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <editTeam
      :show="showModalEdit"
      :editingTeam="editingTeam"
      :editingTeamIndex="editingTeamIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <importExportTeam :show="showModalImportExport" @hide-modal="displayModalImportExport(false)" />
    <div class="flex-wrap">
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>{{ $t("new") }}</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="displayModalImportExport(true)">
          {{ $t("import_export") }}
        </button>
      </div>
    </div>
    <p v-if="teams.length === 0" class="info">
      Create new team
    </p>
    <div class="virtual-list">
      <ul>
        <li v-for="(team, index) in teams" :key="team.name">
          <team :teamIndex="index" :team="team" @edit-team="editTeam(team, index)" />
        </li>
        <li v-if="teams.length === 0">
          <label>Teams are empty</label>
        </li>
      </ul>
    </div>
  </pw-section>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 241px);
}

ul {
  display: flex;
  flex-direction: column;
}
</style>

<script>
import team from "./team"
import { fb } from "~/helpers/fb"

export default {
  components: {
    team,
    "pw-section": () => import("../layout/section"),
    addTeam: () => import("./addTeam"),
    editTeam: () => import("./editTeam"),
    importExportTeam: () => import("./importExportTeam"),
  },
  data() {
    return {
      showModalImportExport: false,
      showModalAdd: false,
      showModalEdit: false,
      editingTeam: undefined,
      editingTeamIndex: undefined,
    }
  },
  computed: {
    teams() {
      return fb.currentUser !== null ? fb.currentTeams : this.$store.state.postwoman.teams
    },
  },
  async mounted() {
    this._keyListener = function (e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.showModalImportExport = false
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))
  },
  methods: {
    displayModalAdd(shouldDisplay) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay) {
      this.showModalImportExport = shouldDisplay
    },
    editTeam(team, teamIndex) {
      this.$data.editingTeam = team
      this.$data.editingTeamIndex = teamIndex
      this.displayModalEdit(true)
      this.syncTeams()
    },
    resetSelectedData() {
      this.$data.editingTeam = undefined
      this.$data.editingTeamIndex = undefined
    },
    syncTeams() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[3].value) {
          fb.writeTeams(JSON.parse(JSON.stringify(this.$store.state.postwoman.teams)))
        }
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
