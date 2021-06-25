<template>
  <AppSection label="teams">
    <div class="flex flex-col">
      <label>{{ $t("teams") }}</label>
      <div v-if="currentUser"></div>
      <div v-else>
        <label>{{ $t("login_with") }}</label>
        <p>
          <FirebaseLogin @show-email="showEmail = true" />
        </p>
      </div>
    </div>

    <TeamsAdd :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <TeamsEdit
      :team="myTeams[0]"
      :show="showModalEdit"
      :editing-team="editingTeam"
      :editingteam-i-d="editingteamID"
      @hide-modal="displayModalEdit(false)"
    />
    <div class="row-wrapper">
      <div>
        <button class="icon button" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>{{ $t("new") }}</span>
        </button>
      </div>
    </div>
    <p v-if="$apollo.queries.myTeams.loading" class="info">
      {{ $t("loading") }}
    </p>
    <p v-if="myTeams.length === 0" class="info">
      <i class="material-icons">help_outline</i> {{ $t("create_new_team") }}
    </p>
    <div v-else class="virtual-list">
      <ul class="flex-col">
        <li v-for="(team, index) in myTeams" :key="`team-${index}`">
          <TeamsTeam
            :team-i-d="team.id"
            :team="team"
            @edit-team="editTeam(team, team.id)"
          />
        </li>
      </ul>
    </div>
    <FirebaseEmail :show="showEmail" @hide-modal="showEmail = false" />
  </AppSection>
</template>

<script>
import gql from "graphql-tag"
import { currentUser$ } from "~/helpers/fb/auth"

export default {
  data() {
    return {
      showModalAdd: false,
      showModalEdit: false,
      editingTeam: {},
      editingteamID: "",
      me: {},
      myTeams: [],
      showEmail: false,
    }
  },
  subscriptions() {
    return {
      currentUser: currentUser$,
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
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
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
      this.editingteamID = teamID
      this.displayModalEdit(true)
    },
    resetSelectedData() {
      this.$data.editingTeam = undefined
      this.$data.editingteamID = undefined
    },
  },
}
</script>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 241px);
}

ul {
  display: flex;
  flex-direction: column;
}
</style>
