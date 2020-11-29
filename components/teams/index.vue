<template>
  <pw-section class="green" icon="history" :label="$t('teams')" ref="teams">
    <add-team :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <edit-team
      :show="showModalEdit"
      :editingTeam="editingTeam"
      :editingTeamIndex="editingTeamIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <import-export-team
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
    <div class="row-wrapper">
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
    <p v-if="myTeams.length === 0" class="info">
      <i class="material-icons">help_outline</i> {{ $t("create_new_team") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li v-for="(team, index) in myTeams" :key="team.name">
          <team :teamIndex="index" :team="team" @edit-team="editTeam(team, index)" />
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
import { fb } from "~/helpers/fb"
import gql from "graphql-tag"

export const myTeams = gql`
  query GetMyTeams {
    myTeams {
      name
    }
  }
`

export default {
  data() {
    return {
      showModalImportExport: false,
      showModalAdd: false,
      showModalEdit: false,
      editingTeam: {
        name: "sample",
        members: [
          { key: "liyas@abc.com", value: "read" },
          { key: "andrew@abc.com", value: "write" },
        ],
      },
      editingTeamIndex: 0,
    }
  },
  apollo: {
    myTeams: {
      query: myTeams,
    },
  },
  computed: {
    myTeams() {
      return [{ name: "D", name: "3" }]
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
      console.log("editTeam")
      this.displayModalEdit(true)
      this.syncTeams()
    },
    resetSelectedData() {
      console.log("resetSelectedData")
    },
    syncTeams() {
      console.log("syncTeams")
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
