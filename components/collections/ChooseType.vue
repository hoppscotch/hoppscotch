<template>
  <div v-if="show">
    <SmartTabs styles="m-4" :id="'collections_tab'" v-on:tab-changed="updateCollectionsType">
      <SmartTab :id="'my-collections'" :label="'My Collections'" :selected="true"> </SmartTab>
      <SmartTab :id="'team-collections'" :label="'Team Collections'">
        <ul>
          <li>
            <span class="select-wrapper">
              <select
                type="text"
                id="team"
                class="team"
                autofocus
                @change="
                  collectionsType.selectedTeam = myTeams[$event.target.value]
                  $emit('update-team-collections')
                "
              >
                <option :key="undefined" :value="undefined" hidden disabled selected>
                  Select team
                </option>
                <option v-for="(team, index) in myTeams" :key="index" :value="index">
                  {{ team.name }}
                </option>
              </select>
            </span>
          </li>
        </ul>
      </SmartTab>
    </SmartTabs>
  </div>
</template>

<script>
import gql from "graphql-tag"

export default {
  props: {
    collectionsType: Object,
    show: Boolean,
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
    updateCollectionsType(tabID) {
      this.collectionsType.type = tabID
      this.$emit("update-team-collections")
    },
  },
}
</script>
