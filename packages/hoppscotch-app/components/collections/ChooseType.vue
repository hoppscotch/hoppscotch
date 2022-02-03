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

<script setup lang="ts">
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { onLoggedIn } from "~/helpers/fb/auth"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useReadonlyStream } from "~/helpers/utils/composables"

type TeamData = GetMyTeamsQuery["myTeams"][number]

defineProps<{
  doc: boolean
  show: boolean
}>()

const emit = defineEmits<{
  (e: "update-collection-type", tabID: string): void
  (e: "update-selected-team", team: TeamData | undefined): void
}>()

const currentUser = useReadonlyStream(currentUserInfo$, null)

const adapter = new TeamListAdapter(true)
const myTeams = useReadonlyStream(adapter.teamList$, [])

onLoggedIn(() => {
  adapter.initialize()
})

const onTeamSelectIntersect = () => {
  // Load team data as soon as intersection
  adapter.fetchList()
}

const updateCollectionsType = (tabID: string) => {
  emit("update-collection-type", tabID)
}

const updateSelectedTeam = (team: TeamData | undefined) => {
  emit("update-selected-team", team)
}
</script>
