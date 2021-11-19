<template>
  <div class="flex flex-col min-h-screen items-center justify-between">
    <div
      v-if="invalidLink"
      class="flex flex-1 items-center justify-center flex-col"
    >
      <i class="opacity-75 pb-2 material-icons">error_outline</i>
      <h1 class="heading text-center">
        {{ $t("team.invalid_invite_link") }}
      </h1>
      <p class="text-center mt-2">
        {{ $t("team.invalid_invite_link_description") }}
      </p>
    </div>
    <div
      v-else-if="loadingCurrentUser"
      class="flex-col flex-1 p-4 flex items-center justify-center"
    >
      <SmartSpinner />
    </div>
    <div
      v-else-if="currentUser === null"
      class="flex-col flex-1 p-4 flex items-center justify-center"
    >
      <h1 class="heading">{{ $t("team.login_to_continue") }}</h1>
      <p class="mt-2">{{ $t("team.login_to_continue_description") }}</p>
      <ButtonPrimary
        :label="$t('auth.login_to_hoppscotch')"
        class="mt-8"
        @click.native="showLogin = true"
      />
    </div>
    <div v-else class="flex-col flex-1 p-4 flex items-center justify-center">
      <div
        v-if="inviteDetails.loading"
        class="flex-col flex-1 p-4 flex items-center justify-center"
      >
        <SmartSpinner />
      </div>
      <div v-else>
        <div
          v-if="!inviteDetails.loading && E.isLeft(inviteDetails.data)"
          class="flex flex-col p-4 items-center"
        >
          <i class="mb-4 material-icons">error_outline</i>
          <p>
            {{ getErrorMessage(inviteDetails.data.left) }}
          </p>
          <p
            class="
              p-4
              items-center
              mt-8
              rounded
              flex-col
              border border-dividerLight
              flex
            "
          >
            <span class="mb-4">
              {{ $t("team.logout_and_try_again") }}
            </span>
            <span class="flex">
              <FirebaseLogout
                v-if="inviteDetails.data.left.type === 'gql_error'"
                outline
              />
            </span>
          </p>
        </div>
        <div
          v-if="
            !inviteDetails.loading &&
            E.isRight(inviteDetails.data) &&
            !joinTeamSuccess
          "
          class="flex-col flex-1 p-4 flex items-center justify-center"
        >
          <h1 class="heading">
            {{
              $t("team.join_team", {
                team: inviteDetails.data.right.teamInvitation.team.name,
              })
            }}
          </h1>
          <p class="text-secondaryLight mt-2">
            {{
              $t("team.invited_to_team", {
                owner:
                  inviteDetails.data.right.teamInvitation.creator.displayName,
                team: inviteDetails.data.right.teamInvitation.team.name,
              })
            }}
          </p>
          <div class="mt-8">
            <ButtonPrimary
              :label="
                $t('team.join_team', {
                  team: inviteDetails.data.right.teamInvitation.team.name,
                })
              "
              :loading="loading"
              :disabled="revokedLink"
              @click.native="joinTeam"
            />
          </div>
        </div>
        <div
          v-if="
            !inviteDetails.loading &&
            E.isRight(inviteDetails.data) &&
            joinTeamSuccess
          "
          class="flex-col flex-1 p-4 flex items-center justify-center"
        >
          <h1 class="heading">
            {{
              $t("team.joined_team", {
                team: inviteDetails.data.right.teamInvitation.team.name,
              })
            }}
          </h1>
          <p class="text-secondaryLight mt-2">
            {{
              $t("team.joined_team_description", {
                team: inviteDetails.data.right.teamInvitation.team.name,
              })
            }}
          </p>
          <div class="mt-8">
            <ButtonSecondary to="/" svg="home" filled :label="$t('app.home')" />
          </div>
        </div>
      </div>
    </div>
    <div class="p-4">
      <ButtonSecondary
        class="tracking-wide !font-bold !text-secondaryDark"
        label="HOPPSCOTCH"
        to="/"
      />
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, useRoute } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { GQLError, useGQLQuery } from "~/helpers/backend/GQLClient"
import {
  GetInviteDetailsDocument,
  GetInviteDetailsQuery,
  GetInviteDetailsQueryVariables,
} from "~/helpers/backend/graphql"
import { acceptTeamInvitation } from "~/helpers/backend/mutations/TeamInvitation"
import { initializeFirebase } from "~/helpers/fb"
import { currentUser$, onLoggedIn, probableUser$ } from "~/helpers/fb/auth"
import { useReadonlyStream } from "~/helpers/utils/composables"

type GetInviteDetailsError =
  | "team_invite/not_valid_viewer"
  | "team_invite/not_found"
  | "team_invite/no_invite_found"
  | "team_invite/email_do_not_match"
  | "team_invite/already_member"

export default defineComponent({
  layout: "empty",

  setup() {
    const route = useRoute()

    const inviteDetails = useGQLQuery<
      GetInviteDetailsQuery,
      GetInviteDetailsQueryVariables,
      GetInviteDetailsError
    >({
      query: GetInviteDetailsDocument,
      variables: {
        inviteID: route.value.query.id as string,
      },
      defer: true,
    })

    onLoggedIn(() => {
      if (typeof route.value.query.id === "string") {
        inviteDetails.execute({
          inviteID: route.value.query.id,
        })
      }
    })

    const probableUser = useReadonlyStream(probableUser$, null)
    const currentUser = useReadonlyStream(currentUser$, null)

    const loadingCurrentUser = computed(() => {
      if (!probableUser.value) return false
      else if (!currentUser.value) return true
      else return false
    })

    return {
      E,
      inviteDetails,
      loadingCurrentUser,
      currentUser,
    }
  },
  data() {
    return {
      invalidLink: false,
      showLogin: false,
      loading: false,
      revokedLink: false,
      inviteID: "",
      joinTeamSuccess: false,
    }
  },
  beforeMount() {
    initializeFirebase()
  },
  mounted() {
    if (typeof this.$route.query.id === "string") {
      this.inviteID = this.$route.query.id
    }
    this.invalidLink = !this.inviteID
    // TODO: check revokeTeamInvitation
    // TODO: check login user already a member
  },
  methods: {
    joinTeam() {
      this.loading = true
      pipe(
        acceptTeamInvitation(this.inviteID),
        TE.matchW(
          () => {
            this.loading = false
            this.$toast.error(`${this.$t("error.something_went_wrong")}`)
          },
          () => {
            this.joinTeamSuccess = true
            this.loading = false
          }
        )
      )()
    },
    getErrorMessage(error: GQLError<GetInviteDetailsError>) {
      if (error.type === "network_error") {
        return this.$t("error.network_error")
      } else {
        switch (error.error) {
          case "team_invite/not_valid_viewer":
            return this.$t("team.not_valid_viewer")
          case "team_invite/not_found":
            return this.$t("team.not_found")
          case "team_invite/no_invite_found":
            return this.$t("team.no_invite_found")
          case "team_invite/already_member":
            return this.$t("team.already_member")
          case "team_invite/email_do_not_match":
            return this.$t("team.email_do_not_match")
          default:
            return this.$t("error.something_went_wrong")
        }
      }
    },
  },
})
</script>
