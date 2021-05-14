<template>
  <div v-if="show">
    <SmartTabs styles="m-4" :id="'collections_tab'" v-on:tab-changed="updateCollectionsType">
      <SmartTab :id="'my-collections'" :label="'My Collections'" :selected="true"> </SmartTab>
      <SmartTab
        :id="'team-collections'"
        :label="'Team Collections'"
        v-if="currentUser && currentUser.eaInvited"
      >
        <ul>
          <li>
            <span class="select-wrapper">
              <SmartIntersection @intersecting="onTeamSelectIntersect">
                <select
                  type="text"
                  id="team"
                  class="team"
                  autofocus
                  @change="updateSelectedTeam(myTeams[$event.target.value])"
                >
                  <option :key="undefined" :value="undefined" hidden disabled selected>
                    Select team
                  </option>
                  <option v-for="(team, index) in myTeams" :key="index" :value="index">
                    {{ team.name }}
                  </option>
                </select>
              </SmartIntersection>
            </span>
          </li>
        </ul>
      </SmartTab>
    </SmartTabs>
  </div>
</template>

<script>
import gql from "graphql-tag"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"

export default {
  props: {
    show: Boolean,
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
    },
  },
  methods: {
    onTeamSelectIntersect() {
      // Load team data as soon as intersection
      this.$apollo.queries.myTeams.refetch()
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
