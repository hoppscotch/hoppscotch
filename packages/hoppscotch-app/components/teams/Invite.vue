<template>
  <SmartModal v-if="show" :title="$t('team.invite')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <div class="flex flex-1 justify-between items-center">
          <label for="memberList" class="pb-4 px-4">
            {{ $t("team.pending_invites") }}
          </label>
        </div>
        <div class="divide-y divide-dividerLight border-divider border rounded">
          <div
            v-if="pendingInvites.loading"
            class="flex p-4 items-center justify-center"
          >
            <SmartSpinner />
          </div>
          <div v-else>
            <div
              v-if="!pendingInvites.loading && E.isRight(pendingInvites.data)"
            >
              <div
                v-for="(invitee, index) in pendingInvites.data.right.team
                  .teamInvitations"
                :key="`invitee-${index}`"
                class="divide-x divide-dividerLight flex"
              >
                <input
                  v-if="invitee"
                  class="
                    bg-transparent
                    flex flex-1
                    text-secondaryLight
                    py-2
                    px-4
                  "
                  :placeholder="`${$t('team.email')}`"
                  :name="'param' + index"
                  :value="invitee.inviteeEmail"
                  readonly
                />
                <input
                  class="
                    bg-transparent
                    flex flex-1
                    text-secondaryLight
                    py-2
                    px-4
                  "
                  :placeholder="`${$t('team.permissions')}`"
                  :name="'value' + index"
                  :value="
                    typeof invitee.inviteeRole === 'string'
                      ? invitee.inviteeRole
                      : JSON.stringify(invitee.inviteeRole)
                  "
                  readonly
                />
                <div class="flex">
                  <ButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="$t('action.remove')"
                    svg="trash"
                    color="red"
                    @click.native="removeInvitee(invitee.id)"
                  />
                </div>
              </div>
            </div>
            <div
              v-if="
                E.isRight(pendingInvites.data) &&
                pendingInvites.data.right.team.teamInvitations.length === 0
              "
              class="
                flex flex-col
                text-secondaryLight
                p-4
                items-center
                justify-center
              "
            >
              <SmartIcon class="opacity-75 pb-2" name="users" />
              <span class="text-center">
                {{ $t("empty.pending_invites") }}
              </span>
            </div>
            <div
              v-if="!pendingInvites.loading && E.isLeft(pendingInvites.data)"
              class="flex flex-col p-4 items-center"
            >
              <i class="mb-4 material-icons">help_outline</i>
              {{ $t("error.something_went_wrong") }}
            </div>
          </div>
        </div>
        <div class="flex pt-4 flex-1 justify-between items-center">
          <label for="memberList" class="p-4">
            {{ $t("team.invite_tooltip") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              svg="plus"
              :label="$t('add.new')"
              filled
              @click.native="addNewInvitee"
            />
          </div>
        </div>
        <div class="divide-y divide-dividerLight border-divider border rounded">
          <div
            v-for="(invitee, index) in newInvites"
            :key="`new-invitee-${index}`"
            class="divide-x divide-dividerLight flex"
          >
            <input
              v-model="invitee.key"
              class="bg-transparent flex flex-1 py-2 px-4"
              :placeholder="$t('team.email')"
              :name="'invitee' + index"
              autofocus
            />
            <span>
              <tippy
                :ref="`newMemberOptions-${index}`"
                interactive
                trigger="click"
                theme="popover"
                arrow
              >
                <template #trigger>
                  <span class="select-wrapper">
                    <input
                      class="
                        bg-transparent
                        cursor-pointer
                        flex flex-1
                        py-2
                        px-4
                      "
                      :placeholder="$t('team.permissions')"
                      :name="'value' + index"
                      :value="
                        typeof invitee.value === 'string'
                          ? invitee.value
                          : JSON.stringify(invitee.value)
                      "
                      readonly
                    />
                  </span>
                </template>
                <SmartItem
                  label="OWNER"
                  @click.native="updateNewInviteeRole(index, 'OWNER')"
                />
                <SmartItem
                  label="EDITOR"
                  @click.native="updateNewInviteeRole(index, 'EDITOR')"
                />
                <SmartItem
                  label="VIEWER"
                  @click.native="updateNewInviteeRole(index, 'VIEWER')"
                />
              </tippy>
            </span>
            <div class="flex">
              <ButtonSecondary
                id="member"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.remove')"
                svg="trash"
                color="red"
                @click.native="removeNewInvitee(index)"
              />
            </div>
          </div>
          <div
            v-if="newInvites.length === 0"
            class="
              flex flex-col
              text-secondaryLight
              p-4
              items-center
              justify-center
            "
          >
            <SmartIcon class="opacity-75 pb-2" name="user-plus" />
            <span class="text-center pb-4">
              {{ $t("empty.invites") }}
            </span>
            <ButtonSecondary
              :label="$t('add.new')"
              filled
              @click.native="addNewInvitee"
            />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('team.invite')" @click.native="sendInvites" />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { watch, ref, reactive, useContext } from "@nuxtjs/composition-api"
import * as T from "fp-ts/Task"
import * as E from "fp-ts/Either"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { flow, pipe } from "fp-ts/function"
import { Email, EmailCodec } from "../../helpers/backend/types/Email"
import { TeamMemberRole } from "../../helpers/backend/graphql"
import {
  createTeamInvitation,
  revokeTeamInvitation,
} from "../../helpers/backend/mutations/TeamInvitation"
import { useGQLQuery } from "~/helpers/backend/GQLClient"
import {
  GetPendingInvitesDocument,
  GetPendingInvitesQuery,
  GetPendingInvitesQueryVariables,
} from "~/helpers/backend/graphql"

const {
  $toast,
  app: { i18n },
} = useContext()
const t = i18n.t.bind(i18n)

const props = defineProps({
  show: Boolean,
  editingteamID: { type: String, default: null },
})

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const pendingInvites = useGQLQuery<
  GetPendingInvitesQuery,
  GetPendingInvitesQueryVariables,
  ""
>({
  query: GetPendingInvitesDocument,
  variables: reactive({
    teamID: props.editingteamID,
  }),
  defer: true,
})

watch(
  () => props.editingteamID,
  () => {
    if (props.editingteamID) {
      pendingInvites.execute({
        teamID: props.editingteamID,
      })
    }
  }
)

watch(
  () => pendingInvites,
  () => {
    console.log(pendingInvites)
  }
)

const removeInvitee = async (id: string) => {
  const result = await revokeTeamInvitation(id)()
  if (E.isLeft(result)) {
    $toast.error(`${t("error.something_went_wrong")}`, {
      icon: "error_outline",
    })
  } else {
    $toast.success(`${t("team.member_removed")}`, {
      icon: "person",
    })
  }
}

const newInvites = ref<Array<{ key: string; value: TeamMemberRole }>>([])

const addNewInvitee = () => {
  newInvites.value.push({
    key: "",
    value: TeamMemberRole.Viewer,
  })
}

const updateNewInviteeRole = (index: number, role: TeamMemberRole) => {
  newInvites.value[index].value = role
}

const removeNewInvitee = (id: number) => {
  newInvites.value.splice(id, 1)
}

const result = ref<
  Array<{
    email: Email
    status: "error" | "success"
  }>
>([])

const sendInvites = async () => {
  const validationResult = pipe(
    newInvites.value,
    O.fromPredicate(
      (invites): invites is Array<{ key: Email; value: TeamMemberRole }> =>
        pipe(
          invites,
          A.every((invitee) => EmailCodec.is(invitee.key))
        )
    ),
    O.map(
      A.map((invitee) =>
        createTeamInvitation(invitee.key, invitee.value, props.editingteamID)
      )
    )
  )

  if (O.isNone(validationResult)) {
    // Error handling for no validation
    $toast.error(`${t("error.incorrect_email")}`, {
      icon: "error_outline",
    })
    return
  }

  result.value = await pipe(
    A.sequence(T.task)(validationResult.value),
    T.chain(
      flow(
        A.mapWithIndex((i, el) =>
          pipe(
            el,
            E.foldW(
              () => ({
                status: "error" as const,
                email: newInvites.value[i].key as Email,
              }),
              () => ({
                status: "success" as const,
                email: newInvites.value[i].key as Email,
              })
            )
          )
        ),
        T.of
      )
    )
  )()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
