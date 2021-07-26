<template>
  <AppSection label="teams">
    <div class="flex flex-col">
      <label>{{ $t("teams") }}</label>
      <div v-if="currentUser"></div>
      <div v-else>
        <label>{{ $t("login_with") }}</label>
        <p>
          <ButtonPrimary
            v-if="currentUser"
            label="Get Started"
            @click.native="showLogin = true"
          />
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
    <div class="flex flex-1">
      <div>
        <ButtonSecondary
          icon="add"
          :label="$t('new')"
          @click.native="displayModalAdd(true)"
        />
      </div>
    </div>
    <p v-if="$apollo.queries.myTeams.loading">
      {{ $t("loading") }}
    </p>
    <p v-if="myTeams.length === 0">
      <i class="material-icons">help_outline</i> {{ $t("create_new_team") }}
    </p>
    <div v-else class="hide-scrollbar !overflow-auto">
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
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
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
      showLogin: false,
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
