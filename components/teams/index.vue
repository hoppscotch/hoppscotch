<template>
  <AppSection class="green" icon="history" :label="$t('teams')" ref="teams" no-legend>
    <TeamsAdd :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <TeamsEdit
      :team="myTeams[0]"
      :show="showModalEdit"
      :editingTeam="editingTeam"
      :editingteamID="editingteamID"
      @hide-modal="displayModalEdit(false)"
    />
    <!-- <TeamsImportExport
      :show="showModalImportExport"
      :teams="myTeams"
      @hide-modal="displayModalImportExport(false)"
    /> -->
    <div class="row-wrapper">
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>{{ $t("new") }}</span>
        </button>
      </div>
      <!-- <div>
        <button class="icon" @click="displayModalImportExport(true)">
          {{ $t("import_export") }}
        </button>
      </div> -->
    </div>
    <p v-if="$apollo.queries.myTeams.loading" class="info">{{ $t("loading") }}</p>
    <p v-if="myTeams.length === 0" class="info">
      <i class="material-icons">help_outline</i> {{ $t("create_new_team") }}
    </p>
    <div v-else class="virtual-list">
      <ul class="flex-col">
        <li v-for="(team, index) in myTeams" :key="`team-${index}`">
          <TeamsTeam :teamID="team.id" :team="team" @edit-team="editTeam(team, team.id)" />
        </li>
      </ul>
    </div>
  </AppSection>
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
import gql from "graphql-tag"

export default {
  data() {
    return {
      showModalImportExport: false,
      showModalAdd: false,
      showModalEdit: false,
      editingTeam: {},
      editingteamID: "",
      me: {},
      myTeams: [],
    }
  },
  apollo: {
    me: {
      query: gql`
        query GetMe {
          me {
            uid
            eaInvited
          }
        }
      `,
      pollInterval: 100000,
    },
    myTeams: {
      query: gql`
        query GetMyTeams {
          myTeams {
            id
            name
            myRole
            ownersCount
            members {
              user {
                displayName
                email
                uid
              }
              role
            }
          }
        }
      `,
      pollInterval: 10000,
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
    editTeam(team, teamID) {
      console.log("editTeamStart", team)
      this.editingTeam = team
      this.editingteamID = team.id
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
