<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
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
          <div class="flex-wrap">
            <label for="memberList">{{ $t("team_member_list") }}</label>
            <div>
              <button class="icon" @click="clearContent($event)" v-tooltip.bottom="$t('clear')">
                <i class="material-icons">clear_all</i>
              </button>
            </div>
          </div>
          <textarea
            id="memberList"
            readonly
            v-textarea-auto-height="memberString"
            v-model="memberString"
            :placeholder="$t('add_one_member')"
            rows="1"
          ></textarea>
        </li>
      </ul>
      <ul v-for="(member, index) in this.editingTeamCopy.members" :key="index">
        <li>
          <input
            :placeholder="$t('parameter_count', { count: index + 1 })"
            :name="'param' + index"
            :value="member.key"
            @change="
              $store.commit('postwoman/setMemberKey', {
                index,
                value: $event.target.value,
              })
            "
            autofocus
          />
        </li>
        <li>
          <input
            :placeholder="$t('value_count', { count: index + 1 })"
            :name="'value' + index"
            :value="typeof member.value === 'string' ? member.value : JSON.stringify(member.value)"
            @change="
              $store.commit('postwoman/setMemberValue', {
                index,
                value: $event.target.value,
              })
            "
          />
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
      <div class="flex-wrap">
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
  </modal>
</template>

<script>
import textareaAutoHeight from "../../directives/textareaAutoHeight"
import { fb } from "~/helpers/fb"

export default {
  directives: {
    textareaAutoHeight,
  },
  props: {
    show: Boolean,
    editingTeam: Object,
    editingTeamIndex: Number,
  },
  components: {
    modal: () => import("../../components/ui/modal"),
  },
  data() {
    return {
      name: undefined,
    }
  },
  watch: {
    editingTeam: function (update) {
      this.name =
        this.$props.editingTeam && this.$props.editingTeam.name
          ? this.$props.editingTeam.name
          : undefined
      this.$store.commit("postwoman/setEditingTeam", this.$props.editingTeam)
    },
  },
  computed: {
    editingTeamCopy() {
      return this.$store.state.postwoman.editingTeam
    },
    memberString() {
      const result = this.editingTeamCopy.members
      return result === "" ? "" : JSON.stringify(result)
    },
  },
  methods: {
    syncTeams() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[3].value) {
          fb.writeTeams(JSON.parse(JSON.stringify(this.$store.state.postwoman.teams)))
        }
      }
    },
    clearContent(e) {
      this.$store.commit("postwoman/removeMembers", [])
      e.target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(() => (e.target.innerHTML = '<i class="material-icons">clear_all</i>'), 1000)
    },
    addTeamMember() {
      let value = { key: "", value: "" }
      this.$store.commit("postwoman/addMember", value)
      this.syncTeams()
    },
    removeTeamMember(index) {
      let memberIndex = index
      const oldMembers = this.editingTeamCopy.members.slice()
      const newMembers = this.editingTeamCopy.members.filter(
        (member, index) => memberIndex !== index
      )

      this.$store.commit("postwoman/removeMember", newMembers)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.$store.commit("postwoman/removeMember", oldMembers)
            toastObject.remove()
          },
        },
      })
      this.syncTeams()
    },
    saveTeam() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_team_name"))
        return
      }
      const teamUpdated = {
        ...this.editingTeamCopy,
        name: this.$data.name,
      }
      this.$store.commit("postwoman/saveTeam", {
        team: teamUpdated,
        teamIndex: this.$props.editingTeamIndex,
      })
      this.$emit("hide-modal")
      this.syncTeams()
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$data.name = undefined
    },
  },
}
</script>
