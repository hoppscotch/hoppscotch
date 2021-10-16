<template>
  <SmartModal v-if="show" :title="$t('team.invite')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <div class="flex flex-1 justify-between items-center">
          <label for="memberList" class="p-4">
            {{ $t("team.pending_invites") }}
          </label>
        </div>
        <div class="divide-y divide-dividerLight border-divider border rounded">
          <div
            v-for="(member, index) in members"
            :key="`member-${index}`"
            class="divide-x divide-dividerLight flex"
          >
            <input
              class="bg-transparent text-secondaryLight flex flex-1 py-2 px-4"
              :placeholder="$t('team.email')"
              :name="'param' + index"
              :value="member.user.email"
              readonly
            />
            <input
              class="bg-transparent text-secondaryLight flex flex-1 py-2 px-4"
              :placeholder="$t('team.permissions')"
              :name="'value' + index"
              :value="
                typeof member.role === 'string'
                  ? member.role
                  : JSON.stringify(member.role)
              "
              readonly
            />
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
          <div
            v-if="members.length === 0"
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
              {{ $t("empty.pending_invites") }}
            </span>
          </div>
        </div>
        <div class="flex flex-1 justify-between items-center">
          <label for="memberList" class="p-4">
            {{ $t("team.invite_tooltip") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              svg="plus"
              :label="$t('add.new')"
              @click.native="addTeamMember"
            />
          </div>
        </div>
        <div class="divide-y divide-dividerLight border-divider border rounded">
          <div
            v-for="(member, index) in newMembers"
            :key="`new-member-${index}`"
            class="divide-x divide-dividerLight flex"
          >
            <input
              v-model="member.key"
              class="bg-transparent flex flex-1 py-2 px-4"
              :placeholder="$t('team.email')"
              :name="'member' + index"
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
                        typeof member.value === 'string'
                          ? member.value
                          : JSON.stringify(member.value)
                      "
                      readonly
                    />
                  </span>
                </template>
                <SmartItem
                  label="OWNER"
                  @click.native="updateNewMemberRole(index, 'OWNER')"
                />
                <SmartItem
                  label="EDITOR"
                  @click.native="updateNewMemberRole(index, 'EDITOR')"
                />
                <SmartItem
                  label="VIEWER"
                  @click.native="updateNewMemberRole(index, 'VIEWER')"
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
                @click.native="removeTeamMember(index)"
              />
            </div>
          </div>
          <div
            v-if="newMembers.length === 0"
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
              :label="$t('add.new')"
              filled
              @click.native="addTeamMember"
            />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('team.invite')" @click.native="saveTeam" />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import cloneDeep from "lodash/cloneDeep"
import { defineComponent } from "@nuxtjs/composition-api"
import * as teamUtils from "~/helpers/teams/utils"
import TeamMemberAdapter from "~/helpers/teams/TeamMemberAdapter"

export default defineComponent({
  props: {
    show: Boolean,
    editingTeam: { type: Object, default: () => {} },
    editingteamID: { type: String, default: null },
  },
  data() {
    return {
      members: [],
      newMembers: [],
      membersAdapter: new TeamMemberAdapter(null),
    }
  },
  watch: {
    editingteamID(teamID) {
      this.membersAdapter.changeTeamID(teamID)
    },
  },
  mounted() {
    this.membersAdapter.members$.subscribe((list) => {
      this.members = cloneDeep(list)
    })
  },
  methods: {
    updateMemberRole(id, role) {
      this.members[id].role = role
      this.$refs[`memberOptions-${id}`][0].tippy().hide()
    },
    updateNewMemberRole(id, role) {
      this.newMembers[id].value = role
      this.$refs[`newMemberOptions-${id}`][0].tippy().hide()
    },
    addTeamMember() {
      const member = { key: "", value: "" }
      this.newMembers.push(member)
    },
    removeExistingTeamMember(userID) {
      teamUtils
        .removeTeamMember(this.$apollo, userID, this.editingteamID)
        .then(() => {
          this.$toast.success(this.$t("team.member_removed"), {
            icon: "done",
          })
          this.hideModal()
        })
        .catch((e) => {
          this.$toast.error(this.$t("error.something_went_wrong"), {
            icon: "error_outline",
          })
          console.error(e)
        })
    },
    removeTeamMember(index) {
      this.newMembers.splice(index, 1)
    },
    validateEmail(emailID) {
      if (
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
          emailID
        )
      ) {
        return true
      }
      return false
    },
    saveTeam() {
      let invalidEmail = false
      this.$data.newMembers.forEach((element) => {
        if (!this.validateEmail(element.key)) {
          this.$toast.error(this.$t("team.invalid_email_format"), {
            icon: "error_outline",
          })
          invalidEmail = true
        }
      })
      if (invalidEmail) return
      let invalidPermission = false
      this.$data.newMembers.forEach((element) => {
        if (!element.value) {
          this.$toast.error(this.$t("invalid_member_permission"), {
            icon: "error_outline",
          })
          invalidPermission = true
        }
      })
      if (invalidPermission) return
      this.$data.newMembers.forEach((element) => {
        // Call to the graphql mutation
        teamUtils
          .addTeamMemberByEmail(
            this.$apollo,
            element.value,
            element.key,
            this.editingteamID
          )
          .then(() => {
            this.$toast.success(this.$t("team.saved"), {
              icon: "done",
            })
          })
          .catch((e) => {
            this.$toast.error(e, {
              icon: "error_outline",
            })
            console.error(e)
          })
      })
      this.members.forEach((element) => {
        teamUtils
          .updateTeamMemberRole(
            this.$apollo,
            element.user.uid,
            element.role,
            this.editingteamID
          )
          .then(() => {
            this.$toast.success(this.$t("team.member_role_updated"), {
              icon: "done",
            })
          })
          .catch((e) => {
            this.$toast.error(e, {
              icon: "error_outline",
            })
            console.error(e)
          })
      })
      this.hideModal()
    },
    hideModal() {
      this.newMembers = []
      this.$emit("hide-modal")
    },
  },
})
</script>
