<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="row-wrapper">
            <h3 class="title">{{ $t("edit_team") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <ul>
        <li>
          <input
            type="text"
            v-model="name"
            :placeholder="editingTeam.name"
            @keyup.enter="saveTeam"
          />
        </li>
      </ul>
      <ul>
        <li>
          <div class="row-wrapper">
            <label for="memberList">{{ $t("team_member_list") }}</label>
            <div></div>
          </div>
        </li>
      </ul>
      <ul
        v-for="(member, index) in members"
        :key="`new-${index}`"
        class="
          border-b border-dashed
          divide-y
          md:divide-x
          border-brdColor
          divide-dashed divide-brdColor
          md:divide-y-0
        "
        :class="{ 'border-t': index == 0 }"
      >
        <li>
          <input
            :placeholder="$t('email')"
            :name="'param' + index"
            :value="member.user.email"
            readonly
          />
        </li>
        <li>
          <span class="select-wrapper">
            <v-popover>
              <input
                :placeholder="$t('permissions')"
                :name="'value' + index"
                :value="typeof member.role === 'string' ? member.role : JSON.stringify(member.role)"
                readonly
              />
              <template slot="popover">
                <div>
                  <button class="icon" v-close-popover @click="updateRole(index, 'OWNER')">
                    OWNER
                  </button>
                </div>
                <div>
                  <button class="icon" v-close-popover @click="updateRole(index, 'EDITOR')">
                    EDITOR
                  </button>
                </div>
                <div>
                  <button class="icon" v-close-popover @click="updateRole(index, 'VIEWER')">
                    VIEWER
                  </button>
                </div>
              </template>
            </v-popover>
          </span>
        </li>
        <div>
          <li>
            <button
              class="icon"
              @click="removeExistingTeamMember(member.user.uid)"
              v-tooltip.bottom="$t('delete')"
              id="member"
            >
              <i class="material-icons">delete</i>
            </button>
          </li>
        </div>
      </ul>
      <ul
        v-for="(member, index) in newMembers"
        :key="index"
        class="
          border-b border-dashed
          divide-y
          md:divide-x
          border-brdColor
          divide-dashed divide-brdColor
          md:divide-y-0
        "
      >
        <li>
          <input
            :placeholder="$t('email')"
            :name="'param' + index"
            v-model="member.key"
            autofocus
          />
        </li>
        <li>
          <span class="select-wrapper">
            <v-popover>
              <input
                :placeholder="$t('permissions')"
                :name="'value' + index"
                :value="
                  typeof member.value === 'string' ? member.value : JSON.stringify(member.value)
                "
                readonly
              />
              <template slot="popover">
                <div>
                  <button class="icon" v-close-popover @click="member.value = 'OWNER'">
                    OWNER
                  </button>
                </div>
                <div>
                  <button class="icon" v-close-popover @click="member.value = 'EDITOR'">
                    EDITOR
                  </button>
                </div>
                <div>
                  <button class="icon" v-close-popover @click="member.value = 'VIEWER'">
                    VIEWER
                  </button>
                </div>
              </template>
            </v-popover>
          </span>
        </li>
        <div>
          <li>
            <button
              class="icon"
              @click="removeTeamMember(index)"
              v-tooltip.bottom="$t('delete')"
              id="member"
            >
              <i class="material-icons">delete</i>
            </button>
          </li>
        </div>
      </ul>
      <ul>
        <li>
          <button class="icon" @click="addTeamMember">
            <i class="material-icons">add</i>
            <span>{{ $t("add_new") }}</span>
          </button>
        </li>
      </ul>
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="saveTeam">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import * as team_utils from "~/helpers/teams/utils"
import cloneDeep from "lodash/cloneDeep"
import TeamMemberAdapter from "~/helpers/teams/TeamMemberAdapter"

export default {
  props: {
    show: Boolean,
    editingTeam: Object,
    editingteamID: String,
  },
  data() {
    return {
      rename: null,
      doneButton: '<i class="material-icons">done</i>',
      members: [],
      newMembers: [],
      membersAdapter: new TeamMemberAdapter(null),
    }
  },
  mounted() {
    this.membersAdapter.members$.subscribe((list) => {
      this.members = cloneDeep(list)
    })
  },
  watch: {
    editingteamID(teamID) {
      this.membersAdapter.changeTeamID(teamID)
    },
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
  methods: {
    updateRole(id, role) {
      this.members[id].role = role
    },
    addTeamMember() {
      let value = { key: "", value: "" }
      this.newMembers.push(value)
    },
    removeExistingTeamMember(userID) {
      team_utils
        .removeTeamMember(this.$apollo, userID, this.editingteamID)
        .then((data) => {
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
      if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(emailID)) {
        return true
      }
      return false
    },
    saveTeam() {
      if (this.$data.rename !== null && this.$data.rename.replace(/\s/g, "").length < 6) {
        this.$toast.error(this.$t("string_length_insufficient"), {
          icon: "error",
        })
        return
      }
      this.$data.newMembers.forEach((element) => {
        if (!this.validateEmail(element.key)) {
          this.$toast.error(this.$t("invalid_emailID_format"), {
            icon: "error",
          })
          return
        }
      })
      this.$data.newMembers.forEach((element) => {
        // Call to the graphql mutation
        team_utils
          .addTeamMemberByEmail(this.$apollo, element.value, element.key, this.editingteamID)
          .then((data) => {
            // Result
            this.$toast.success(this.$t("team_saved"), {
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
      })
      let messageShown = true
      this.members.forEach((element) => {
        team_utils
          .updateTeamMemberRole(this.$apollo, element.user.uid, element.role, this.editingteamID)
          .then((data) => {
            // Result
            if (messageShown) {
              this.$toast.success(this.$t("role_updated"), {
                icon: "done",
              })
              messageShown = false
            }
            this.hideModal()
          })
          .catch((error) => {
            // Error
            if (messageShown) {
              this.$toast.error(this.$t("error_occurred"), {
                icon: "done",
              })
              messageShown = false
            }
            console.error(error)
          })
      })
      if (this.$data.rename !== null) {
        const newName = this.name === this.$data.rename ? this.name : this.$data.rename
        if (!/\S/.test(newName))
          return this.$toast.error(this.$t("team_name_empty"), {
            icon: "error",
          })
        // Call to the graphql mutation
        if (this.name !== this.rename)
          team_utils
            .renameTeam(this.$apollo, newName, this.editingteamID)
            .then((data) => {
              // Result
              this.$toast.success(this.$t("team_saved"), {
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
      }
      this.hideModal()
      this.newMembers = []
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$data.name = undefined
    },
  },
}
</script>
