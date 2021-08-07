<template>
  <AppSection label="teams">
    <h4 class="font-bold text-secondaryDark">
      {{ $t("team.title") }}
    </h4>
    <div class="mt-1 text-secondaryLight">
      Join
      <SmartAnchor label="beta" to="https://hoppscotch.io/beta" blank />
      to access teams.
    </div>
    <div class="space-y-4 mt-4">
      <ButtonSecondary
        :label="$t('team.create_new')"
        outline
        @click.native="displayModalAdd(true)"
      />
      <p v-if="$apollo.queries.myTeams.loading">
        {{ $t("loading") }}
      </p>
      <div v-if="myTeams.length === 0" class="flex items-center">
        <i class="mr-4 material-icons">help_outline</i>
        {{ $t("empty.teams") }}
      </div>
      <div
        v-else
        class="
          divide-y divide-dividerLight
          border border-divider
          rounded
          flex flex-col flex-1
          md:w-64
        "
      >
        <TeamsTeam
          v-for="(team, index) in myTeams"
          :key="`team-${index}`"
          :team-i-d="team.id"
          :team="team"
          @edit-team="editTeam(team, team.id)"
        />
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
                photoURL
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
