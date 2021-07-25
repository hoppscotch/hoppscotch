<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_team") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelTeamEdit" class="font-semibold px-4 pb-4">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelTeamEdit"
          v-model="name"
          class="input"
          type="text"
          :placeholder="editingTeam.name"
          @keyup.enter="saveTeam"
        />
        <label for="memberList" class="font-semibold px-4 pt-4 pb-4">
          {{ $t("team_member_list") }}
        </label>
        <ul
          v-for="(member, index) in members"
          :key="`member-${index}`"
          class="
            divide-y divide-dashed divide-divider
            border-b border-dashed border-divider
            md:divide-x md:divide-y-0
          "
          :class="{ 'border-t': index == 0 }"
        >
          <li>
            <input
              class="input"
              :placeholder="$t('email')"
              :name="'param' + index"
              :value="member.user.email"
              readonly
            />
          </li>
          <li>
            <span class="select-wrapper">
              <tippy
                ref="options"
                interactive
                tabindex="-1"
                trigger="click"
                theme="popover"
                arrow
              >
                <template #trigger>
                  <input
                    class="input"
                    :placeholder="$t('permissions')"
                    :name="'value' + index"
                    :value="
                      typeof member.role === 'string'
                        ? member.role
                        : JSON.stringify(member.role)
                    "
                    readonly
                  />
                </template>
                <SmartItem
                  label="OWNER"
                  @click.native="
                    updateRole(index, 'OWNER')
                    $refs.options.tippy().hide()
                  "
                />
                <SmartItem
                  label="EDITOR"
                  @click.native="
                    updateRole(index, 'EDITOR')
                    $refs.options.tippy().hide()
                  "
                />
                <SmartItem
                  label="VIEWER"
                  @click.native="
                    updateRole(index, 'VIEWER')
                    $refs.options.tippy().hide()
                  "
                />
              </tippy>
            </span>
          </li>
          <div>
            <li>
              <ButtonSecondary
                id="member"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('delete')"
                icon="delete"
                color="red"
                @click.native="removeExistingTeamMember(member.user.uid)"
              />
            </li>
          </div>
        </ul>
        <ul
          v-for="(member, index) in newMembers"
          :key="`member-${index}`"
          class="
            divide-y divide-dashed divide-divider
            border-b border-dashed border-divider
            md:divide-x md:divide-y-0
          "
        >
          <li>
            <input
              v-model="member.key"
              class="input"
              :placeholder="$t('email')"
              :name="'param' + index"
              autofocus
            />
          </li>
          <li>
            <span class="select-wrapper">
              <tippy
                ref="memberOptions"
                interactive
                tabindex="-1"
                trigger="click"
                theme="popover"
                arrow
              >
                <template #trigger>
                  <input
                    class="input"
                    :placeholder="$t('permissions')"
                    :name="'value' + index"
                    :value="
                      typeof member.value === 'string'
                        ? member.value
                        : JSON.stringify(member.value)
                    "
                    readonly
                  />
                </template>
                <SmartItem
                  label="OWNER"
                  @click.native="
                    member.value = 'OWNER'
                    $refs.options.tippy().hide()
                  "
                />
                <SmartItem
                  label="EDITOR"
                  @click.native="
                    member.value = 'EDITOR'
                    $refs.options.tippy().hide()
                  "
                />
                <SmartItem
                  label="VIEWER"
                  @click.native="
                    member.value = 'VIEWER'
                    $refs.options.tippy().hide()
                  "
                />
              </tippy>
            </span>
          </li>
          <div>
            <li>
              <ButtonSecondary
                id="member"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('delete')"
                icon="delete"
                color="red"
                @click.native="removeTeamMember(index)"
              />
            </li>
          </div>
        </ul>
        <ul>
          <li>
            <ButtonSecondary
              icon="add"
              :label="$t('add_new')"
              @click.native="addTeamMember"
            />
          </li>
        </ul>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="saveTeam" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import cloneDeep from "lodash/cloneDeep"
import * as teamUtils from "~/helpers/teams/utils"
import TeamMemberAdapter from "~/helpers/teams/TeamMemberAdapter"

export default {
  props: {
    show: Boolean,
    editingTeam: { type: Object, default: () => {} },
    editingteamID: { type: String, default: null },
  },
  data() {
    return {
      rename: null,
      members: [],
      newMembers: [],
      membersAdapter: new TeamMemberAdapter(null),
    }
  },
  computed: {
    editingTeamCopy() {
      return this.editingTeam
    },
    name: {
      get() {
        return this.editingTeam.name
      },
      set(name) {
        this.rename = name
      },
    },
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
    updateRole(id, role) {
      this.members[id].role = role
    },
    addTeamMember() {
      const value = { key: "", value: "" }
      this.newMembers.push(value)
    },
    removeExistingTeamMember(userID) {
      teamUtils
        .removeTeamMember(this.$apollo, userID, this.editingteamID)
        .then(() => {
          // Result
          this.$toast.success(this.$t("user_removed"), {
            icon: "done",
          })
          this.hideModal()
        })
        .catch((error) => {
          // Error
          this.$toast.error(this.$t("error_occurred"), {
            icon: "done",
          })
          console.error(error)
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
      if (
        this.$data.rename !== null &&
        this.$data.rename.replace(/\s/g, "").length < 6
      ) {
        this.$toast.error(this.$t("string_length_insufficient"), {
          icon: "error",
        })
        return
      }
      let invalidEmail = false
      this.$data.newMembers.forEach((element) => {
        if (!this.validateEmail(element.key)) {
          this.$toast.error(this.$t("invalid_emailID_format"), {
            icon: "error",
          })
          invalidEmail = true
        }
      })
      if (invalidEmail) return
      let invalidPermission = false
      this.$data.newMembers.forEach((element) => {
        if (!element.value) {
          this.$toast.error(this.$t("invalid_member_permission"), {
            icon: "error",
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
            // Result
            this.$toast.success(this.$t("team_saved"), {
              icon: "done",
            })
          })
          .catch((error) => {
            // Error
            this.$toast.error(error, {
              icon: "done",
            })
            console.error(error)
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
            // Result
            this.$toast.success(this.$t("role_updated"), {
              icon: "done",
            })
          })
          .catch((error) => {
            // Error
            this.$toast.error(error, {
              icon: "done",
            })
            console.error(error)
          })
      })
      if (this.$data.rename !== null) {
        const newName =
          this.name === this.$data.rename ? this.name : this.$data.rename
        if (!/\S/.test(newName))
          return this.$toast.error(this.$t("team_name_empty"), {
            icon: "error",
          })
        // Call to the graphql mutation
        if (this.name !== this.rename)
          teamUtils
            .renameTeam(this.$apollo, newName, this.editingteamID)
            .then(() => {
              // Result
              this.$toast.success(this.$t("team_saved"), {
                icon: "done",
              })
            })
            .catch((error) => {
              // Error
              this.$toast.error(this.$t("error_occurred"), {
                icon: "done",
              })
              console.error(error)
            })
      }
      this.hideModal()
    },
    hideModal() {
      this.rename = null
      this.newMembers = []
      this.$emit("hide-modal")
    },
  },
}
</script>
