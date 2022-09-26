<template>
  <div v-show="show">
    <SmartTabs
      :id="'collections_tab'"
      v-model="selectedCollectionTab"
      render-inactive-tabs
    >
      <SmartTab
        :id="'my-collections'"
        :label="`${t('collection.my_collections')}`"
      />
      <SmartTab
        v-if="currentUser"
        :id="'team-collections'"
        :label="`${t('collection.team_collections')}`"
      >
        <SmartIntersection @intersecting="onTeamSelectIntersect">
          <tippy
            interactive
            trigger="click"
            theme="popover"
            arrow
            placement="bottom"
          >
            <span
              v-tippy="{ theme: 'tooltip' }"
              :title="`${t('collection.select_team')}`"
              class="bg-transparent border-b border-dividerLight select-wrapper"
            >
              <ButtonSecondary
                v-if="collectionsType.selectedTeam"
                :icon="IconUsers"
                :label="collectionsType.selectedTeam.name"
                class="flex-1 !justify-start pr-8 rounded-none"
              />
              <ButtonSecondary
                v-else
                :label="`${t('collection.select_team')}`"
                class="flex-1 !justify-start pr-8 rounded-none"
              />
            </span>
            <template #content="{ hide }">
              <div
                class="flex flex-col"
                tabindex="0"
                role="menu"
                @keyup.escape="hide()"
              >
                <SmartItem
                  v-for="(team, index) in myTeams"
                  :key="`team-${index}`"
                  :label="team.name"
                  :info-icon="
                    team.id === collectionsType.selectedTeam?.id
                      ? IconDone
                      : null
                  "
                  :active-info-icon="
                    team.id === collectionsType.selectedTeam?.id
                  "
                  :icon="IconUsers"
                  @click="
                    () => {
                      updateSelectedTeam(team)
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </SmartIntersection>
      </SmartTab>
    </SmartTabs>
  </div>
</template>

<script setup lang="ts">
import IconUsers from "~icons/lucide/users"
import IconDone from "~icons/lucide/check"
import { ref, watch } from "vue"
import { GetMyTeamsQuery, Team } from "~/helpers/backend/graphql"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useReadonlyStream } from "@composables/stream"
import { onLoggedIn } from "@composables/auth"
import { useI18n } from "@composables/i18n"
import { useLocalState } from "~/newstore/localstate"

type TeamData = GetMyTeamsQuery["myTeams"][number]

type CollectionTabs = "my-collections" | "team-collections"

const t = useI18n()

const selectedCollectionTab = ref<CollectionTabs>("my-collections")

defineProps<{
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
const myTeams = useReadonlyStream(adapter.teamList$, null)
const REMEMBERED_TEAM_ID = useLocalState("REMEMBERED_TEAM_ID")
let teamListFetched = false

watch(myTeams, (teams) => {
  if (teams && !teamListFetched) {
    teamListFetched = true
    if (REMEMBERED_TEAM_ID.value && currentUser) {
      const team = teams.find((t) => t.id === REMEMBERED_TEAM_ID.value)
      if (team) updateSelectedTeam(team)
    }
  }
})

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
  REMEMBERED_TEAM_ID.value = team?.id
  emit("update-selected-team", team)
}

watch(selectedCollectionTab, (newValue: string) => {
  updateCollectionsType(newValue)
})
</script>
