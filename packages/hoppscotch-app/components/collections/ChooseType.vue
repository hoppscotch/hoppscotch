<template>
  <div v-if="show">
    <SmartTabs :id="'collections_tab'" @tab-changed="updateCollectionsType">
      <SmartTab
        :id="'my-collections'"
        :label="`${$t('collection.my_collections')}`"
        :selected="true"
      />
      <SmartTab
        v-if="currentUser && !doc"
        :id="'team-collections'"
        :label="`${$t('collection.team_collections')}`"
      >
        <SmartIntersection @intersecting="onTeamSelectIntersect">
          <div class="select-wrapper">
            <select
              id="team"
              type="text"
              autocomplete="off"
              autofocus
              class="flex w-full px-4 py-2 font-semibold bg-transparent border-t appearance-none cursor-pointer border-dividerLight hover:bg-primaryDark"
              @change="updateSelectedTeam(myTeams[$event.target.value])"
            >
              <option
                :key="undefined"
                :value="undefined"
                hidden
                disabled
                selected
              >
                {{ $t("collection.select_team") }}
              </option>
              <option
                v-for="(team, index) in myTeams"
                :key="`team-${String(index)}`"
                :value="String(index)"
              >
                {{ team.name }}
              </option>
            </select>
          </div>
        </SmartIntersection>
      </SmartTab>
    </SmartTabs>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import gql from "graphql-tag"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"
import { useReadonlyStream } from "~/helpers/utils/composables"

export default defineComponent({
  props: {
    doc: Boolean,
    show: Boolean,
  },
  setup() {
    return {
      currentUser: useReadonlyStream(currentUserInfo$, null),
    }
  },
  data() {
    return {
      skipTeamsFetching: true,
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
    updateCollectionsType(tabID: string) {
      this.$emit("update-collection-type", tabID)
    },
    updateSelectedTeam(team: any) {
      this.$emit("update-selected-team", team)
    },
  },
})
</script>
