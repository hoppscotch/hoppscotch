<template>
  <SmartModal v-if="show" :title="t('team.edit')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <div class="flex relative">
          <input
            id="selectLabelTeamEdit"
            v-model="name"
            v-focus
            class="input floating-input"
            placeholder=" "
            type="text"
            autocomplete="off"
            @keyup.enter="saveTeam"
          />
          <label for="selectLabelTeamEdit">
            {{ t("action.label") }}
          </label>
        </div>
        <div class="flex flex-1 pt-4 items-center justify-between">
          <label for="memberList" class="p-4">
            {{ t("team.members") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              svg="user-plus"
              :label="t('team.invite')"
              filled
              @click.native="
                () => {
                  $emit('invite-team')
                }
              "
            />
          </div>
        </div>
        <div
          v-if="teamDetails.loading"
          class="flex flex-col items-center justify-center"
        >
          <SmartSpinner class="mb-4" />
          <span class="text-secondaryLight">{{ t("state.loading") }}</span>
        </div>
        <div
          v-if="
            !teamDetails.loading &&
            E.isRight(teamDetails.data) &&
            teamDetails.data.right.team.teamMembers
          "
          class="divide-dividerLight divide-y border border-divider rounded"
        >
          <div
            v-if="teamDetails.data.right.team.teamMembers === 0"
            class="flex flex-col text-secondaryLight p-4 items-center justify-center"
          >
            <img
              :src="`/images/states/${$colorMode.value}/add_group.svg`"
              loading="lazy"
              class="flex-col object-contain object-center h-16 my-4 w-16 inline-flex"
              :alt="`${t('empty.members')}`"
            />
            <span class="text-center pb-4">
              {{ t("empty.members") }}
            </span>
            <ButtonSecondary
              svg="user-plus"
              :label="t('team.invite')"
              @click.native="
                () => {
                  emit('invite-team')
                }
              "
            />
          </div>
          <div v-else>
            <div
              v-for="(member, index) in membersList"
              :key="`member-${index}`"
              class="divide-dividerLight divide-x flex"
            >
              <input
                class="bg-transparent flex flex-1 py-2 px-4"
                :placeholder="`${t('team.email')}`"
                :name="'param' + index"
                :value="member.email"
                readonly
              />
              <span>
                <tippy
                  ref="memberOptions"
                  interactive
                  trigger="click"
                  theme="popover"
                  arrow
                >
                  <template #trigger>
                    <span class="select-wrapper">
                      <input
                        class="bg-transparent cursor-pointer flex flex-1 py-2 px-4"
                        :placeholder="`${t('team.permissions')}`"
                        :name="'value' + index"
                        :value="member.role"
                        readonly
                      />
                    </span>
                  </template>
                  <SmartItem
                    label="OWNER"
                    :icon="
                      member.role === 'OWNER'
                        ? 'radio_button_checked'
                        : 'radio_button_unchecked'
                    "
                    :active="member.role === 'OWNER'"
                    @click.native="
                      () => {
                        updateMemberRole(member.userID, 'OWNER')
                        memberOptions[index].tippy().hide()
                      }
                    "
                  />
                  <SmartItem
                    label="EDITOR"
                    :icon="
                      member.role === 'EDITOR'
                        ? 'radio_button_checked'
                        : 'radio_button_unchecked'
                    "
                    :active="member.role === 'EDITOR'"
                    @click.native="
                      () => {
                        updateMemberRole(member.userID, 'EDITOR')
                        memberOptions[index].tippy().hide()
                      }
                    "
                  />
                  <SmartItem
                    label="VIEWER"
                    :icon="
                      member.role === 'VIEWER'
                        ? 'radio_button_checked'
                        : 'radio_button_unchecked'
                    "
                    :active="member.role === 'VIEWER'"
                    @click.native="
                      () => {
                        updateMemberRole(member.userID, 'VIEWER')
                        memberOptions[index].tippy().hide()
                      }
                    "
                  />
                </tippy>
              </span>
              <div class="flex">
                <ButtonSecondary
                  id="member"
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.remove')"
                  svg="user-minus"
                  color="red"
                  @click.native="removeExistingTeamMember(member.userID)"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="!teamDetails.loading && E.isLeft(teamDetails.data)"
          class="flex flex-col items-center"
        >
          <i class="mb-4 material-icons">help_outline</i>
          {{ t("error.something_went_wrong") }}
        </div>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="t('action.save')" @click.native="saveTeam" />
        <ButtonSecondary
          :label="t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import {
  GetTeamDocument,
  GetTeamQuery,
  GetTeamQueryVariables,
  TeamMemberAddedDocument,
  TeamMemberRemovedDocument,
  TeamMemberRole,
  TeamMemberUpdatedDocument,
} from "~/helpers/backend/graphql"
import {
  removeTeamMember,
  renameTeam,
  updateTeamMemberRole,
} from "~/helpers/backend/mutations/Team"
import { TeamNameCodec } from "~/helpers/backend/types/TeamName"
import { useGQLQuery } from "~/helpers/backend/GQLClient"
import { useI18n, useToast } from "~/helpers/utils/composables"

const t = useI18n()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const memberOptions = ref<any | null>(null)

const props = defineProps<{
  show: boolean
  editingTeam: {
    name: string
  }
  editingTeamID: string
}>()

const toast = useToast()

const name = toRef(props.editingTeam, "name")

watch(
  () => props.editingTeam.name,
  (newName: string) => {
    name.value = newName
  }
)

watch(
  () => props.editingTeamID,
  (teamID: string) => {
    teamDetails.execute({ teamID })
  }
)

const teamDetails = useGQLQuery<GetTeamQuery, GetTeamQueryVariables, "">({
  query: GetTeamDocument,
  variables: {
    teamID: props.editingTeamID,
  },
  defer: true,
  updateSubs: computed(() => {
    if (props.editingTeamID) {
      return [
        {
          key: 1,
          query: TeamMemberAddedDocument,
          variables: {
            teamID: props.editingTeamID,
          },
        },
        {
          key: 2,
          query: TeamMemberUpdatedDocument,
          variables: {
            teamID: props.editingTeamID,
          },
        },
        {
          key: 3,
          query: TeamMemberRemovedDocument,
          variables: {
            teamID: props.editingTeamID,
          },
        },
      ]
    } else return []
  }),
})

const roleUpdates = ref<
  {
    userID: string
    role: TeamMemberRole
  }[]
>([])

watch(
  () => teamDetails,
  () => {
    if (teamDetails.loading) return

    const data = teamDetails.data

    if (E.isRight(data)) {
      const members = data.right.team?.teamMembers ?? []

      // Remove deleted members
      roleUpdates.value = roleUpdates.value.filter(
        (update) =>
          members.findIndex((y) => y.user.uid === update.userID) !== -1
      )
    }
  }
)

const updateMemberRole = (userID: string, role: TeamMemberRole) => {
  const updateIndex = roleUpdates.value.findIndex(
    (item) => item.userID === userID
  )
  if (updateIndex !== -1) {
    // Role Update exists
    roleUpdates.value[updateIndex].role = role
  } else {
    // Role Update does not exist
    roleUpdates.value.push({
      userID,
      role,
    })
  }
}

const membersList = computed(() => {
  if (teamDetails.loading) return []

  const data = teamDetails.data

  if (E.isLeft(data)) return []

  if (E.isRight(data)) {
    const members = (data.right.team?.teamMembers ?? []).map((member) => {
      const updatedRole = roleUpdates.value.find(
        (update) => update.userID === member.user.uid
      )

      return {
        userID: member.user.uid,
        email: member.user.email!,
        role: updatedRole?.role ?? member.role,
      }
    })

    return members
  }

  return []
})

const removeExistingTeamMember = async (userID: string) => {
  const removeTeamMemberResult = await removeTeamMember(
    userID,
    props.editingTeamID
  )()
  if (E.isLeft(removeTeamMemberResult)) {
    toast.error(`${t("error.something_went_wrong")}`)
  } else {
    toast.success(`${t("team.member_removed")}`)
  }
}

const saveTeam = async () => {
  if (name.value !== "") {
    if (TeamNameCodec.is(name.value)) {
      const updateTeamNameResult = await renameTeam(
        props.editingTeamID,
        name.value
      )()
      if (E.isLeft(updateTeamNameResult)) {
        toast.error(`${t("error.something_went_wrong")}`)
      } else {
        roleUpdates.value.forEach(async (update) => {
          const updateMemberRoleResult = await updateTeamMemberRole(
            update.userID,
            props.editingTeamID,
            update.role
          )()
          if (E.isLeft(updateMemberRoleResult)) {
            toast.error(`${t("error.something_went_wrong")}`)
            console.error(updateMemberRoleResult.left.error)
          }
        })
      }
      hideModal()
      toast.success(`${t("team.saved")}`)
    } else {
      return toast.error(`${t("team.name_length_insufficient")}`)
    }
  } else {
    return toast.error(`${t("empty.team_name")}`)
  }
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
