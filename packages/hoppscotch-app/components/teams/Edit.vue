<template>
  <SmartModal v-if="show" :title="$t('team.edit')" @close="hideModal">
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
            {{ $t("action.label") }}
          </label>
        </div>
        <div class="flex pt-4 flex-1 justify-between items-center">
          <label for="memberList" class="p-4">
            {{ $t("team.members") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              svg="user-plus"
              :label="$t('team.invite')"
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
          <span class="text-secondaryLight">{{ $t("state.loading") }}</span>
        </div>
        <div
          v-if="
            !teamDetails.loading &&
            E.isRight(teamDetails.data) &&
            teamDetails.data.right.team.teamMembers
          "
          class="divide-y divide-dividerLight border-divider border rounded"
        >
          <div
            v-if="teamDetails.data.right.team.teamMembers === 0"
            class="
              flex flex-col
              text-secondaryLight
              p-4
              items-center
              justify-center
            "
          >
            <SmartIcon class="opacity-75 pb-2" name="users" />
            <span class="text-center pb-4">
              {{ $t("empty.members") }}
            </span>
            <ButtonSecondary
              svg="user-plus"
              :label="$t('team.invite')"
              @click.native="
                () => {
                  emit('invite-team')
                }
              "
            />
          </div>
          <div v-else>
            <div
              v-for="(member, index) in teamDetails.data.right.team.teamMembers"
              :key="`member-${index}`"
              class="divide-x divide-dividerLight flex"
            >
              <input
                class="bg-transparent flex flex-1 py-2 px-4"
                :placeholder="$t('team.email')"
                :name="'param' + index"
                :value="member.user.email"
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
                          typeof member.role === 'string'
                            ? member.role
                            : JSON.stringify(member.role)
                        "
                        readonly
                      />
                    </span>
                  </template>
                  <SmartItem
                    label="OWNER"
                    @click.native="
                      () => {
                        updateMemberRole(member.user.uid, 'OWNER')
                        memberOptions[index].tippy().hide()
                      }
                    "
                  />
                  <SmartItem
                    label="EDITOR"
                    @click.native="
                      () => {
                        updateMemberRole(member.user.uid, 'EDITOR')
                        memberOptions[index].tippy().hide()
                      }
                    "
                  />
                  <SmartItem
                    label="VIEWER"
                    @click.native="
                      () => {
                        updateMemberRole(member.user.uid, 'VIEWER')
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
                  :title="$t('action.remove')"
                  svg="trash"
                  color="red"
                  @click.native="removeExistingTeamMember(member.user.uid)"
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
          {{ $t("error.something_went_wrong") }}
        </div>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('action.save')" @click.native="saveTeam" />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  toRef,
  useContext,
  watch,
} from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { TeamsTeamMember } from "~/helpers/teams/TeamMemberAdapter"
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

const {
  $toast,
  app: { i18n },
} = useContext()
const t = i18n.t.bind(i18n)

const members = ref<TeamsTeamMember[]>([])

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

const updateMemberRole = (userID: string, role: TeamMemberRole) => {
  members.value[userID].role = role
}

const removeExistingTeamMember = async (userID: string) => {
  const removeTeamMemberResult = await removeTeamMember(
    userID,
    props.editingTeamID
  )()
  if (E.isLeft(removeTeamMemberResult)) {
    $toast.error(t("error.something_went_wrong"), {
      icon: "error",
    })
  } else {
    $toast.success(t("team.member_removed"), {
      icon: "done",
    })
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
        $toast.error(t("error.something_went_wrong"), {
          icon: "error",
        })
      } else {
        $toast.success(t("team.name_updated"), {
          icon: "done",
        })
        members.value.forEach(
          async (element: { user: { uid: any }; role: any }) => {
            const updateMemberRoleResult = await updateTeamMemberRole(
              element.user.uid,
              props.editingTeamID,
              element.role
            )()
            if (E.isLeft(updateMemberRoleResult)) {
              $toast.error(t("error.something_went_wrong"), {
                icon: "error",
              })
              console.error(updateMemberRoleResult.left.error)
            } else {
              $toast.success(t("team.member_role_updated"), {
                icon: "done",
              })
            }
          }
        )
      }
      hideModal()
    } else {
      return $toast.error(t("team.name_length_insufficient"), {
        icon: "error_outline",
      })
    }
  } else {
    return $toast.error(t("empty.team_name"), {
      icon: "error_outline",
    })
  }
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
