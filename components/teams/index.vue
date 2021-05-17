<template>
  <AppSection class="green" icon="history" :label="$t('teams')" ref="teams" no-legend>
    <div class="flex flex-col">
      <label>{{ $t("teams") }}</label>
      <div v-if="fb.currentUser"></div>
      <div v-else>
        <label>{{ $t("login_with") }}</label>
        <p>
          <FirebaseLogin />
        </p>
      </div>
    </div>

    <TeamsAdd :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <TeamsEdit
      :team="myTeams[0]"
      :show="showModalEdit"
      :editingTeam="editingTeam"
      :editingteamID="editingteamID"
      @hide-modal="displayModalEdit(false)"
    />
    <div class="row-wrapper">
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>{{ $t("new") }}</span>
        </button>
      </div>
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
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      showModalAdd: false,
      showModalEdit: false,
      editingTeam: {},
      editingteamID: "",
      me: {},
      myTeams: [],
      fb,
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
  methods: {
    displayModalAdd(shouldDisplay) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    editTeam(team, teamID) {
      this.editingTeam = team
      this.editingteamID = team.id
      this.displayModalEdit(true)
    },
    resetSelectedData() {
      this.$data.editingTeam = undefined
      this.$data.editingteamID = undefined
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
