<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="row-wrapper">
            <h3 class="title">{{ $t("edit_team") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <closeIcon class="material-icons" />
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
            <div>
              <button class="icon" @click="clearContent($event)" v-tooltip.bottom="$t('clear')">
                <i class="material-icons">clear_all</i>
              </button>
            </div>
          </div>
        </li>
      </ul>
      <ul v-for="(member, index) in this.editingTeamCopy.members" :key="index">
        <li>
          <input :placeholder="$t('email')" :name="'param' + index" :value="member.key" autofocus />
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
                  <button class="icon" v-close-popover>READ</button>
                </div>
                <div>
                  <button class="icon" v-close-popover>WRITE</button>
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
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"

export default {
  props: {
    show: Boolean,
    editingTeam: Object,
    editingTeamIndex: Number,
  },
  components: {
    closeIcon,
  },
  data() {
    return {
      name: undefined,
      doneButton: '<i class="material-icons">done</i>',
    }
  },
  watch: {
    editingTeam: function (update) {
      console.log("editingTeam")
    },
  },
  computed: {
    editingTeamCopy() {
      return this.editingTeam
      console.log("editingTeamCopy")
    },
    memberString() {
      console.log("memberString")
    },
  },
  methods: {
    clearContent(e) {
      console.log("clearContent")
      e.target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(() => (e.target.innerHTML = '<i class="material-icons">clear_all</i>'), 1000)
    },
    addTeamMember() {
      console.log("addTeamMember")
    },
    removeTeamMember(index) {
      console.log("removeTeamMember")
    },
    saveTeam() {
      console.log("saveTeam")
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$data.name = undefined
    },
  },
}
</script>
