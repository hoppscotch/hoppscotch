<template>
  <HoppSmartModal v-if="show" dialog :title="t('team.edit')" @close="hideModal">
    <template #body>
      <div class="flex flex-col">
        <div class="relative flex">
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
        <div class="flex items-center justify-between flex-1 pt-4">
          <label for="memberList" class="p-4">
            {{ t("team.members") }}
          </label>
          <div class="flex">
            <HoppButtonSecondary
              :icon="IconUserPlus"
              :label="t('team.invite')"
              filled
              @click="
                () => {
                  emit('invite-team')
                }
              "
            />
          </div>
        </div>
        <div v-if="teamDetails.loading" class="border rounded border-divider">
          <div class="flex items-center justify-center p-4">
            <HoppSmartSpinner />
          </div>
        </div>
        <div
          v-if="
            !teamDetails.loading &&
            E.isRight(teamDetails.data) &&
            teamDetails.data.right.team.teamMembers
          "
          class="border rounded border-divider"
        >
          <div
            v-if="teamDetails.data.right.team.teamMembers === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${colorMode.value}/add_group.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
              :alt="`${t('empty.members')}`"
            />
            <span class="pb-4 text-center">
              {{ t("empty.members") }}
            </span>
            <HoppButtonSecondary
              :icon="IconUserPlus"
              :label="t('team.invite')"
              @click="
                () => {
                  emit('invite-team')
                }
              "
            />
          </div>
          <div v-else class="divide-y divide-dividerLight">
            <div
              v-for="(member, index) in membersList"
              :key="`member-${index}`"
              class="flex divide-x divide-dividerLight"
            >
              <input
                class="flex flex-1 px-4 py-2 bg-transparent"
                :placeholder="`${t('team.email')}`"
                :name="'param' + index"
                :value="member.email"
                readonly
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
                      :value="member.role"
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
                          member.role === 'OWNER' ? IconCircleDot : IconCircle
                        "
                        :active="member.role === 'OWNER'"
                        @click="
                          () => {
                            updateMemberRole(member.userID, 'OWNER')
                            hide()
                          }
                        "
                      />
                      <HoppSmartItem
                        label="EDITOR"
                        :icon="
                          member.role === 'EDITOR' ? IconCircleDot : IconCircle
                        "
                        :active="member.role === 'EDITOR'"
                        @click="
                          () => {
                            updateMemberRole(member.userID, 'EDITOR')
                            hide()
                          }
                        "
                      />
                      <HoppSmartItem
                        label="VIEWER"
                        :icon="
                          member.role === 'VIEWER' ? IconCircleDot : IconCircle
                        "
                        :active="member.role === 'VIEWER'"
                        @click="
                          () => {
                            updateMemberRole(member.userID, 'VIEWER')
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
                  :icon="IconUserMinus"
                  color="red"
                  :loading="isLoadingIndex === index"
                  @click="removeExistingTeamMember(member.userID, index)"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="!teamDetails.loading && E.isLeft(teamDetails.data)"
          class="flex flex-col items-center"
        >
          <component :is="IconHelpCircle" class="mb-4 svg-icons" />
          {{ t("error.something_went_wrong") }}
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="isLoading"
          outline
          @click="saveTeam"
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
import { computed, ref, toRef, watch } from "vue"
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

import { useGQLQuery } from "~/composables/graphql"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useColorMode } from "@composables/theming"
import { TippyComponent } from "vue-tippy"

import IconCircleDot from "~icons/lucide/circle-dot"
import IconCircle from "~icons/lucide/circle"
import IconUserPlus from "~icons/lucide/user-plus"
import IconUserMinus from "~icons/lucide/user-minus"
import IconHelpCircle from "~icons/lucide/help-circle"

const t = useI18n()
const colorMode = useColorMode()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "refetch-teams"): void
  (e: "invite-team"): void
}>()

// Template refs
const tippyActions = ref<TippyComponent[] | null>(null)

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
  pollDuration: 10000,
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

watch(
  () => props.show,
  (show) => {
    if (!show) {
      teamDetails.pause()
    } else {
      teamDetails.unpause()
    }
  }
)

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

const isLoadingIndex = ref<null | number>(null)

const removeExistingTeamMember = async (userID: string, index: number) => {
  isLoadingIndex.value = index
  const removeTeamMemberResult = await removeTeamMember(
    userID,
    props.editingTeamID
  )()
  if (E.isLeft(removeTeamMemberResult)) {
    toast.error(`${t("error.something_went_wrong")}`)
  } else {
    toast.success(`${t("team.member_removed")}`)
    emit("refetch-teams")
    teamDetails.execute({ teamID: props.editingTeamID })
  }
  isLoadingIndex.value = null
}

const isLoading = ref(false)

const saveTeam = async () => {
  isLoading.value = true
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
      toast.error(`${t("team.name_length_insufficient")}`)
    }
  } else {
    toast.error(`${t("empty.team_name")}`)
  }
  isLoading.value = false
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
