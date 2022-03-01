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
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
            placement="bottom"
          >
            <template #trigger>
              <span
                v-tippy="{ theme: 'tooltip' }"
                :title="`${$t('collection.select_team')}`"
                class="bg-transparent border-t border-dividerLight select-wrapper"
              >
                <ButtonSecondary
                  v-if="collectionsType.selectedTeam"
                  svg="users"
                  :label="collectionsType.selectedTeam.name"
                  class="flex-1 !justify-start pr-8 rounded-none"
                />
                <ButtonSecondary
                  v-else
                  :label="`${$t('collection.select_team')}`"
                  class="flex-1 !justify-start pr-8 rounded-none"
                />
              </span>
            </template>
            <div class="flex flex-col" role="menu">
              <SmartItem
                v-for="(team, index) in myTeams"
                :key="`team-${index}`"
                :label="team.name"
                :info-icon="
                  team.id === collectionsType.selectedTeam?.id ? 'done' : ''
                "
                :active-info-icon="team.id === collectionsType.selectedTeam?.id"
                svg="users"
                @click.native="
                  () => {
                    updateSelectedTeam(team)
                    options.tippy().hide()
                  }
                "
              />
            </div>
          </tippy>
        </SmartIntersection>
      </SmartTab>
    </SmartTabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { GetMyTeamsQuery, Team } from "~/helpers/backend/graphql"
import { onLoggedIn } from "~/helpers/fb/auth"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useReadonlyStream } from "~/helpers/utils/composables"

type TeamData = GetMyTeamsQuery["myTeams"][number]

defineProps<{
  doc: boolean
  show: boolean
  collectionsType: {
    type: "my-collections" | "team-collections"
    selectedTeam: Team | undefined
  }
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

const options = ref<any | null>(null)

const updateSelectedTeam = (team: TeamData | undefined) => {
  emit("update-selected-team", team)
}
</script>
