<template>
  <div v-if="show">
    <SmartTabs :id="'collections_tab'" @tab-changed="updateCollectionsType">
      <SmartTab
        :id="'my-collections'"
        :label="'My Collections'"
        :selected="true"
      />
      <SmartTab
        v-if="currentUser && currentUser.eaInvited && !doc"
        :id="'team-collections'"
        :label="'Team Collections'"
      >
        <SmartIntersection @intersecting="onTeamSelectIntersect">
          <select
            id="team"
            type="text"
            autofocus
            class="
              flex
              w-full
              px-4
              text-xs
              py-2
              focus:outline-none
              border-b border-dividerLight
            "
            @change="updateSelectedTeam(myTeams[$event.target.value])"
          >
            <option
              :key="undefined"
              :value="undefined"
              hidden
              disabled
              selected
            >
              Select team
            </option>
            <option
              v-for="(team, index) in myTeams"
              :key="index"
              :value="index"
            >
              {{ team.name }}
            </option>
          </select>
        </SmartIntersection>
      </SmartTab>
    </SmartTabs>
  </div>
</template>

<script>
import gql from "graphql-tag"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"

export default {
  props: {
    doc: Boolean,
    show: Boolean,
  },
  data() {
    return {
      skipTeamsFetching: true,
    }
  },
  subscriptions() {
    return {
      currentUser: currentUserInfo$,
    }
  },
  apollo: {
    myTeams: {
      query: gql`
        query GetMyTeams {
          myTeams {
            id
            name
            myRole
          }
        }
      `,
      pollInterval: 10000,
      skip() {
        return this.skipTeamsFetching
      },
    },
  },
  methods: {
    onTeamSelectIntersect() {
      // Load team data as soon as intersection
      this.$apollo.queries.myTeams.refetch()
      this.skipTeamsFetching = false
    },
    updateCollectionsType(tabID) {
      this.$emit("update-collection-type", tabID)
    },
    updateSelectedTeam(team) {
      this.$emit("update-selected-team", team)
    },
  },
}
</script>
