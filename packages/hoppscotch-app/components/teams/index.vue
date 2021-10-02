<template>
  <AppSection label="teams">
    <div class="space-y-4 p-4">
      <ButtonSecondary
        :label="`${$t('team.create_new')}`"
        outline
        @click.native="displayModalAdd(true)"
      />
      <div
        v-if="myTeams.loading"
        class="flex flex-col items-center justify-center"
      >
        <SmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ $t("state.loading") }}</span>
      </div>
      <div
        v-if="
          !myTeams.loading &&
          E.isRight(myTeams.data) &&
          myTeams.data.right.myTeams.length === 0
        "
        class="flex items-center"
      >
        <i class="mr-4 material-icons">help_outline</i>
        {{ $t("empty.teams") }}
      </div>
      <div
        v-else-if="!myTeams.loading && E.isRight(myTeams.data)"
        class="grid gap-4 sm:grid-cols-3 md:grid-cols-4"
      >
        <TeamsTeam
          v-for="(team, index) in myTeams.data.right.myTeams"
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
      v-if="
        !myTeams.loading &&
        E.isRight(myTeams.data) &&
        myTeams.data.right.myTeams.length > 0
      "
      :team="myTeams.data.right.myTeams[0]"
      :show="showModalEdit"
      :editing-team="editingTeam"
      :editingteam-i-d="editingTeamID"
      @hide-modal="displayModalEdit(false)"
    />
  </AppSection>
</template>

<script setup lang="ts">
import { gql } from "@apollo/client/core"
import { ref, watchEffect } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { useGQLQuery } from "~/helpers/backend/GQLClient"
import { MyTeamsQueryError } from "~/helpers/backend/QueryErrors"
import { TeamMemberRole } from "~/helpers/backend/types/TeamMemberRole"

const showModalAdd = ref(false)
const showModalEdit = ref(false)
const editingTeam = ref<any>({}) // TODO: Check this out
const editingTeamID = ref<any>("")

const myTeams = useGQLQuery<
  {
    myTeams: Array<{
      id: string
      name: string
      myRole: TeamMemberRole
      ownersCount: number
      members: Array<{
        user: {
          photoURL: string | null
          displayName: string
          email: string
          uid: string
        }
        role: TeamMemberRole
      }>
    }>
  },
  MyTeamsQueryError
>(
  gql`
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
  `
)

watchEffect(() => {
  console.log(myTeams)
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
