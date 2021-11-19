<template>
  <AppSection label="teams">
    <div class="space-y-4 p-4">
      <ButtonSecondary
        :label="`${t('team.create_new')}`"
        outline
        @click.native="displayModalAdd(true)"
      />
      <div
        v-if="myTeams.loading"
        class="flex flex-col items-center justify-center"
      >
        <SmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <div
        v-if="
          !myTeams.loading &&
          E.isRight(myTeams.data) &&
          myTeams.data.right.myTeams.length === 0
        "
        class="
          flex flex-col
          text-secondaryLight
          p-4
          items-center
          justify-center
        "
      >
        <img
          :src="`/images/states/${$colorMode.value}/add_group.svg`"
          loading="lazy"
          class="
            flex-col
            mb-8
            object-contain object-center
            h-16
            w-16
            inline-flex
          "
          :alt="`${t('empty.teams')}`"
        />
        <span class="text-center mb-4">
          {{ t("empty.teams") }}
        </span>
        <ButtonSecondary
          :label="`${t('team.create_new')}`"
          filled
          @click.native="displayModalAdd(true)"
        />
      </div>
      <div
        v-else-if="!myTeams.loading && E.isRight(myTeams.data)"
        class="grid gap-4"
        :class="
          modal ? 'grid-cols-1' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        "
      >
        <TeamsTeam
          v-for="(team, index) in myTeams.data.right.myTeams"
          :key="`team-${String(index)}`"
          :team-i-d="team.id"
          :team="team"
          :compact="modal"
          @edit-team="editTeam(team, team.id)"
          @invite-team="inviteTeam(team, team.id)"
        />
      </div>
      <div
        v-if="!myTeams.loading && E.isLeft(myTeams.data)"
        class="flex flex-col items-center"
      >
        <i class="mb-4 material-icons">help_outline</i>
        {{ t("error.something_went_wrong") }}
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
      :editing-team-i-d="editingTeamID"
      @hide-modal="displayModalEdit(false)"
      @invite-team="inviteTeam(editingTeam, editingTeamID)"
    />
    <TeamsInvite
      v-if="
        !myTeams.loading &&
        E.isRight(myTeams.data) &&
        myTeams.data.right.myTeams.length > 0
      "
      :team="myTeams.data.right.myTeams[0]"
      :show="showModalInvite"
      :editing-team="editingTeam"
      :editing-team-i-d="editingTeamID"
      @hide-modal="displayModalInvite(false)"
    />
  </AppSection>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { useGQLQuery } from "~/helpers/backend/GQLClient"
import {
  MyTeamsDocument,
  MyTeamsQuery,
  MyTeamsQueryVariables,
} from "~/helpers/backend/graphql"
import { MyTeamsQueryError } from "~/helpers/backend/QueryErrors"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

defineProps<{
  modal: boolean
}>()

const showModalAdd = ref(false)
const showModalEdit = ref(false)
const showModalInvite = ref(false)
const editingTeam = ref<any>({}) // TODO: Check this out
const editingTeamID = ref<any>("")

const myTeams = useGQLQuery<
  MyTeamsQuery,
  MyTeamsQueryVariables,
  MyTeamsQueryError
>({
  query: MyTeamsDocument,
  pollDuration: 5000,
})

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
}

const displayModalEdit = (shouldDisplay: boolean) => {
  showModalEdit.value = shouldDisplay
}

const displayModalInvite = (shouldDisplay: boolean) => {
  showModalInvite.value = shouldDisplay
}

const editTeam = (team: any, teamID: any) => {
  editingTeam.value = team
  editingTeamID.value = teamID
  displayModalEdit(true)
}

const inviteTeam = (team: any, teamID: any) => {
  editingTeam.value = team
  editingTeamID.value = teamID
  displayModalInvite(true)
}
</script>
