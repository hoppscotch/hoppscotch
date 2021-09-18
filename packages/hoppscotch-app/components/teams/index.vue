<template>
  <AppSection label="teams">
    <h4 class="text-secondaryDark">
      {{ $t("team.title") }}
    </h4>
    <div class="mt-1 text-secondaryLight">
      <SmartAnchor
        :label="`${$t('team.join_beta')}`"
        to="https://hoppscotch.io/beta"
        blank
        class="link"
      />
    </div>
    <div class="space-y-4 mt-4">
      <ButtonSecondary
        :label="`${$t('team.create_new')}`"
        outline
        @click.native="displayModalAdd(true)"
      />
      <p
        v-if="myTeamsLoading"
        class="flex flex-col items-center justify-center"
      >
        <SmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ $t("state.loading") }}</span>
      </p>
      <div
        v-if="!myTeamsLoading && myTeams.myTeams.length === 0"
        class="flex items-center"
      >
        <i class="mr-4 material-icons">help_outline</i>
        {{ $t("empty.teams") }}
      </div>
      <div
        v-else-if="!myTeamsLoading && !isApolloError(myTeams)"
        class="grid gap-4 sm:grid-cols-2 md:grid-cols-3"
      >
        <TeamsTeam
          v-for="(team, index) in myTeams.myTeams"
          :key="`team-${String(index)}`"
          :team-i-d="team.id"
          :team="team"
          @edit-team="editTeam(team, team.id)"
        />
      </div>
    </div>
    <TeamsAdd :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <!-- ¯\_(ツ)_/¯ -->
    <TeamsEdit
      v-if="!myTeamsLoading && myTeams.myTeams.length > 0"
      :team="myTeams.myTeams[0]"
      :show="showModalEdit"
      :editing-team="editingTeam"
      :editingteam-i-d="editingTeamID"
      @hide-modal="displayModalEdit(false)"
    />
  </AppSection>
</template>

<script setup lang="ts">
import { gql } from "@apollo/client/core"
import { ref } from "@nuxtjs/composition-api"
import { useGQLQuery, isApolloError } from "~/helpers/apollo"

const showModalAdd = ref(false)
const showModalEdit = ref(false)
const editingTeam = ref<any>({}) // TODO: Check this out
const editingTeamID = ref<any>("")

const { loading: myTeamsLoading, data: myTeams } = useGQLQuery({
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
})

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
}

const displayModalEdit = (shouldDisplay: boolean) => {
  showModalEdit.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}
const editTeam = (team: any, teamID: any) => {
  editingTeam.value = team
  editingTeamID.value = teamID
  displayModalEdit(true)
}

const resetSelectedData = () => {
  editingTeam.value = undefined
  editingTeamID.value = undefined
}
</script>
