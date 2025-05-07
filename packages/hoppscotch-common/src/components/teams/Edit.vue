<template>
  <HoppSmartModal v-if="show" dialog :title="t('team.edit')" @close="hideModal">
    <template #body>
      <div class="flex flex-col">
        <HoppSmartInput
          v-model="editingName"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          @submit="saveTeam"
        />
        <div class="flex flex-1 items-center justify-between pt-4">
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
        <div v-if="teamDetails.loading" class="rounded border border-divider">
          <div class="flex items-center justify-center p-4">
            <HoppSmartSpinner />
          </div>
        </div>
        <div
          v-if="
            !teamDetails.loading &&
            E.isRight(teamDetails.data) &&
            teamDetails.data.right.team?.teamMembers
          "
          class="rounded border border-divider"
        >
          <HoppSmartPlaceholder
            v-if="teamDetails.data.right.team.teamMembers.length === 0"
            :src="`/images/states/${colorMode.value}/add_group.svg`"
            :alt="`${t('empty.members')}`"
            :text="t('empty.members')"
          >
            <template #body>
              <HoppButtonSecondary
                :icon="IconUserPlus"
                :label="t('team.invite')"
                @click="
                  () => {
                    emit('invite-team')
                  }
                "
              />
            </template>
          </HoppSmartPlaceholder>
          <div v-else class="divide-y divide-dividerLight">
            <div
              v-for="(member, index) in membersList"
              :key="`member-${index}`"
              class="flex divide-x divide-dividerLight"
            >
              <input
                class="flex flex-1 bg-transparent px-4 py-2"
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
                  <HoppSmartSelectWrapper>
                    <input
                      class="flex flex-1 cursor-pointer bg-transparent px-4 py-2"
                      :placeholder="`${t('team.permissions')}`"
                      :name="'value' + index"
                      :value="member.role"
                      readonly
                    />
                  </HoppSmartSelectWrapper>
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
                            updateAccessRole(
                              member.userID,
                              TeamAccessRole.Owner
                            )
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
                            updateAccessRole(
                              member.userID,
                              TeamAccessRole.Editor
                            )
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
                            updateAccessRole(
                              member.userID,
                              TeamAccessRole.Viewer
                            )
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
          <icon-lucide-help-circle class="svg-icons mb-4" />
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
import { computed, ref, watch } from "vue"
import * as E from "fp-ts/Either"
import {
  GetTeamDocument,
  GetTeamQuery,
  GetTeamQueryVariables,
  TeamMemberAddedDocument,
  TeamMemberRemovedDocument,
  TeamAccessRole,
  TeamMemberUpdatedDocument,
} from "~/helpers/backend/graphql"
import {
  removeTeamMember,
  renameTeam,
  updateTeamAccessRole,
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

const editingName = ref(props.editingTeam.name)

watch(
  () => props.editingTeam.name,
  (newName: string) => {
    editingName.value = newName
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
  pollLoadingEnabled: false,
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
    }
    return []
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
    role: TeamAccessRole
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

const updateAccessRole = (userID: string, role: TeamAccessRole) => {
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
  if (editingName.value !== "") {
    if (TeamNameCodec.is(editingName.value)) {
      const updateTeamNameResult = await renameTeam(
        props.editingTeamID,
        editingName.value
      )()
      if (E.isLeft(updateTeamNameResult)) {
        toast.error(`${t("error.something_went_wrong")}`)
      } else {
        roleUpdates.value.forEach(async (update) => {
          const updateAccessRoleResult = await updateTeamAccessRole(
            update.userID,
            props.editingTeamID,
            update.role
          )()
          if (E.isLeft(updateAccessRoleResult)) {
            toast.error(`${t("error.something_went_wrong")}`)
            console.error(updateAccessRoleResult.left.error)
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
