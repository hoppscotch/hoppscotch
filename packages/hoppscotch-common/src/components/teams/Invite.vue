<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('team.invite')"
    @close="hideModal"
  >
    <template #body>
      <div v-if="sendInvitesResult.length" class="flex flex-col px-4">
        <div class="flex flex-col items-center justify-center max-w-md mb-8">
          <icon-lucide-users class="w-6 h-6 text-accent" />
          <h3 class="my-2 text-lg text-center">
            {{ t("team.we_sent_invite_link") }}
          </h3>
          <p class="text-center">
            {{ t("team.we_sent_invite_link_description") }}
          </p>
        </div>
        <div v-if="successInvites.length">
          <label class="mb-4 block">
            {{ t("team.success_invites") }}
          </label>
          <div
            class="flex flex-col p-4 border rounded space-y-6 border-dividerLight"
          >
            <div
              v-for="(invitee, index) in successInvites"
              :key="`invitee-${index}`"
            >
              <p class="flex items-center">
                <component
                  :is="IconMailCheck"
                  class="mr-4 svg-icons text-green-500"
                />
                <span class="truncate">{{ invitee.email }}</span>
              </p>
            </div>
          </div>
        </div>
        <div v-if="failedInvites.length" class="mt-6">
          <label class="mb-4 block">
            {{ t("team.failed_invites") }}
          </label>
          <div
            class="flex flex-col p-4 border rounded space-y-6 border-dividerLight"
          >
            <div
              v-for="(invitee, index) in failedInvites"
              :key="`invitee-${index}`"
            >
              <p class="flex items-center">
                <component
                  :is="IconAlertTriangle"
                  class="mr-4 svg-icons text-red-500"
                />
                <span class="truncate">{{ invitee.email }}</span>
              </p>
              <p class="mt-2 ml-8 text-red-500">
                {{ getErrorMessage(invitee.error) }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        v-else-if="sendingInvites"
        class="flex items-center justify-center p-4"
      >
        <HoppSmartSpinner />
      </div>
      <div v-else class="flex flex-col">
        <div class="flex items-center justify-between flex-1">
          <label for="memberList" class="px-4 pb-4">
            {{ t("team.pending_invites") }}
          </label>
        </div>
        <div class="border rounded divide-y divide-dividerLight border-divider">
          <div
            v-if="pendingInvites.loading"
            class="flex items-center justify-center p-4"
          >
            <HoppSmartSpinner />
          </div>
          <div v-else>
            <div
              v-if="!pendingInvites.loading && E.isRight(pendingInvites.data)"
              class="divide-y divide-dividerLight"
            >
              <div
                v-for="(invitee, index) in pendingInvites.data.right.team
                  ?.teamInvitations"
                :key="`invitee-${index}`"
                class="flex divide-x divide-dividerLight"
              >
                <input
                  v-if="invitee"
                  class="flex flex-1 px-4 py-2 bg-transparent text-secondaryLight"
                  :placeholder="`${t('team.email')}`"
                  :name="'param' + index"
                  :value="invitee.inviteeEmail"
                  readonly
                />
                <input
                  class="flex flex-1 px-4 py-2 bg-transparent text-secondaryLight"
                  :placeholder="`${t('team.permissions')}`"
                  :name="'value' + index"
                  :value="invitee.inviteeRole"
                  readonly
                />
                <div class="flex">
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('action.remove')"
                    :icon="IconTrash"
                    color="red"
                    :loading="isLoadingIndex === index"
                    @click="removeInvitee(invitee.id, index)"
                  />
                </div>
              </div>
            </div>
            <HoppSmartPlaceholder
              v-if="
                E.isRight(pendingInvites.data) &&
                pendingInvites.data.right.team?.teamInvitations.length === 0
              "
              :text="t('empty.pending_invites')"
            >
            </HoppSmartPlaceholder>
            <div
              v-if="!pendingInvites.loading && E.isLeft(pendingInvites.data)"
              class="flex flex-col items-center p-4"
            >
              <icon-lucide-help-circle class="mb-4 svg-icons" />
              {{ t("error.something_went_wrong") }}
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between flex-1 pt-4">
          <label for="memberList" class="p-4">
            {{ t("team.invite_tooltip") }}
          </label>
          <div class="flex">
            <HoppButtonSecondary
              :icon="IconPlus"
              :label="t('add.new')"
              filled
              @click="addNewInvitee"
            />
          </div>
        </div>
        <div class="border rounded divide-y divide-dividerLight border-divider">
          <div
            v-for="(invitee, index) in newInvites"
            :key="`new-invitee-${index}`"
            class="flex divide-x divide-dividerLight"
          >
            <input
              v-model="invitee.key"
              class="flex flex-1 px-4 py-2 bg-transparent"
              :placeholder="`${t('team.email')}`"
              :name="'invitee' + index"
              autofocus
            />
            <span>
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => tippyActions![index].focus()"
              >
                <span class="select-wrapper">
                  <input
                    class="flex flex-1 px-4 py-2 bg-transparent cursor-pointer"
                    :placeholder="`${t('team.permissions')}`"
                    :name="'value' + index"
                    :value="invitee.value"
                    readonly
                  />
                </span>
                <template #content="{ hide }">
                  <div
                    ref="tippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      label="OWNER"
                      :icon="
                        invitee.value === 'OWNER' ? IconCircleDot : IconCircle
                      "
                      :active="invitee.value === 'OWNER'"
                      @click="
                        () => {
                          updateNewInviteeRole(index, TeamMemberRole.Owner)
                          hide()
                        }
                      "
                    />
                    <HoppSmartItem
                      label="EDITOR"
                      :icon="
                        invitee.value === 'EDITOR' ? IconCircleDot : IconCircle
                      "
                      :active="invitee.value === 'EDITOR'"
                      @click="
                        () => {
                          updateNewInviteeRole(index, TeamMemberRole.Editor)
                          hide()
                        }
                      "
                    />
                    <HoppSmartItem
                      label="VIEWER"
                      :icon="
                        invitee.value === 'VIEWER' ? IconCircleDot : IconCircle
                      "
                      :active="invitee.value === 'VIEWER'"
                      @click="
                        () => {
                          updateNewInviteeRole(index, TeamMemberRole.Viewer)
                          hide()
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </span>
            <div class="flex">
              <HoppButtonSecondary
                id="member"
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.remove')"
                :icon="IconTrash"
                color="red"
                @click="removeNewInvitee(index)"
              />
            </div>
          </div>
          <HoppSmartPlaceholder
            v-if="newInvites.length === 0"
            :src="`/images/states/${colorMode.value}/add_group.svg`"
            :alt="`${t('empty.invites')}`"
            :text="`${t('empty.invites')}`"
          >
            <HoppButtonSecondary
              :label="t('add.new')"
              filled
              @click="addNewInvitee"
            />
          </HoppSmartPlaceholder>
        </div>
        <div
          v-if="newInvites.length"
          class="flex flex-col items-start px-4 py-4 mt-4 border rounded border-dividerLight"
        >
          <span
            class="flex items-center justify-center px-2 py-1 mb-4 font-semibold border rounded-full bg-primaryDark border-divider"
          >
            <icon-lucide-help-circle
              class="mr-2 text-secondaryLight svg-icons"
            />
            {{ t("profile.roles") }}
          </span>
          <p>
            <span class="text-secondaryLight">
              {{ t("profile.roles_description") }}
            </span>
          </p>
          <ul class="mt-4 space-y-4">
            <li class="flex">
              <span
                class="w-1/4 font-semibold uppercase truncate text-secondaryDark max-w-16"
              >
                {{ t("profile.owner") }}
              </span>
              <span class="flex flex-1">
                {{ t("profile.owner_description") }}
              </span>
            </li>
            <li class="flex">
              <span
                class="w-1/4 font-semibold uppercase truncate text-secondaryDark max-w-16"
              >
                {{ t("profile.editor") }}
              </span>
              <span class="flex flex-1">
                {{ t("profile.editor_description") }}
              </span>
            </li>
            <li class="flex">
              <span
                class="w-1/4 font-semibold uppercase truncate text-secondaryDark max-w-16"
              >
                {{ t("profile.viewer") }}
              </span>
              <span class="flex flex-1">
                {{ t("profile.viewer_description") }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </template>
    <template #footer>
      <p
        v-if="sendInvitesResult.length"
        class="flex justify-between flex-1 text-secondaryLight"
      >
        <HoppButtonSecondary
          class="link !p-0"
          :label="t('team.invite_more')"
          :icon="IconArrowLeft"
          @click="
            () => {
              sendInvitesResult = []
              newInvites = [
                {
                  key: '',
                  value: TeamMemberRole.Viewer,
                },
              ]
            }
          "
        />
        <HoppButtonSecondary
          class="link !p-0"
          :label="`${t('action.dismiss')}`"
          @click="hideModal"
        />
      </p>
      <span v-else class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('team.invite')"
          outline
          @click="sendInvites"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { watch, ref, reactive, computed } from "vue"
import * as T from "fp-ts/Task"
import * as E from "fp-ts/Either"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { flow, pipe } from "fp-ts/function"
import { Email, EmailCodec } from "../../helpers/backend/types/Email"
import {
  TeamInvitationAddedDocument,
  TeamInvitationRemovedDocument,
  TeamMemberRole,
  GetPendingInvitesDocument,
  GetPendingInvitesQuery,
  GetPendingInvitesQueryVariables,
} from "../../helpers/backend/graphql"
import {
  createTeamInvitation,
  CreateTeamInvitationErrors,
  revokeTeamInvitation,
} from "../../helpers/backend/mutations/TeamInvitation"
import { GQLError } from "~/helpers/backend/GQLClient"
import { useGQLQuery } from "@composables/graphql"

import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useColorMode } from "~/composables/theming"

import IconTrash from "~icons/lucide/trash"
import IconPlus from "~icons/lucide/plus"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconMailCheck from "~icons/lucide/mail-check"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconCircle from "~icons/lucide/circle"
import IconArrowLeft from "~icons/lucide/arrow-left"
import { TippyComponent } from "vue-tippy"

const t = useI18n()

const toast = useToast()

const colorMode = useColorMode()

// Template refs
const tippyActions = ref<TippyComponent[] | null>(null)

const props = defineProps({
  show: Boolean,
  editingTeamID: { type: String, default: null },
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
    teamID: props.editingTeamID,
  }),
  pollDuration: 10000,
  updateSubs: computed(() =>
    !props.editingTeamID
      ? []
      : [
          {
            key: 4,
            query: TeamInvitationAddedDocument,
            variables: {
              teamID: props.editingTeamID,
            },
          },
          {
            key: 5,
            query: TeamInvitationRemovedDocument,
            variables: {
              teamID: props.editingTeamID,
            },
          },
        ]
  ),
  defer: true,
})

watch(
  () => props.show,
  (show) => {
    if (!show) {
      pendingInvites.pause()
    } else {
      pendingInvites.unpause()
    }
  }
)

watch(
  () => props.editingTeamID,
  () => {
    if (props.editingTeamID) {
      pendingInvites.execute({
        teamID: props.editingTeamID,
      })
    }
  }
)

const isLoadingIndex = ref<null | number>(null)

const removeInvitee = async (id: string, index: number) => {
  isLoadingIndex.value = index
  const result = await revokeTeamInvitation(id)()
  if (E.isLeft(result)) {
    toast.error(`${t("error.something_went_wrong")}`)
  } else {
    toast.success(`${t("team.member_removed")}`)
  }
  isLoadingIndex.value = null
}

const newInvites = ref<Array<{ key: string; value: TeamMemberRole }>>([
  {
    key: "",
    value: TeamMemberRole.Viewer,
  },
])

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

type SendInvitesErrorType =
  | {
      email: Email
      status: "error"
      error: GQLError<CreateTeamInvitationErrors>
    }
  | {
      email: Email
      status: "success"
    }

const sendInvitesResult = ref<Array<SendInvitesErrorType>>([])
const successInvites = computed(() =>
  sendInvitesResult.value.filter((invitee) => invitee.status === "success")
)
const failedInvites = computed(() =>
  sendInvitesResult.value.filter((invitee) => invitee.status === "error")
)

const sendingInvites = ref<boolean>(false)

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
        createTeamInvitation(invitee.key, invitee.value, props.editingTeamID)
      )
    )
  )

  if (O.isNone(validationResult)) {
    // Error handling for no validation
    toast.error(`${t("error.incorrect_email")}`)
    return
  }

  sendingInvites.value = true

  sendInvitesResult.value = await pipe(
    A.sequence(T.task)(validationResult.value),
    T.chain(
      flow(
        A.mapWithIndex((i, el) =>
          pipe(
            el,
            E.foldW(
              (err) => ({
                status: "error" as const,
                email: newInvites.value[i].key as Email,
                error: err,
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

  sendingInvites.value = false
}

const getErrorMessage = (error: SendInvitesErrorType) => {
  if (error.type === "network_error") {
    return t("error.network_error")
  } else {
    switch (error.error) {
      case "team/invalid_id":
        return t("team.invalid_id")
      case "team/member_not_found":
        return t("team.member_not_found")
      case "team_invite/already_member":
        return t("team.already_member")
      case "team_invite/member_has_invite":
        return t("team.member_has_invite")
    }
  }
}

const hideModal = () => {
  sendingInvites.value = false
  sendInvitesResult.value = []
  newInvites.value = [
    {
      key: "",
      value: TeamMemberRole.Viewer,
    },
  ]
  emit("hide-modal")
}
</script>
