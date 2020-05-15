<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">{{ $t("new_team") }}</h3>
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
            :placeholder="$t('my_new_team')"
            @keyup.enter="addNewTeam"
          />
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
          <button class="icon primary" @click="addNewTeam">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from "../../functions/fb"

export default {
  props: {
    show: Boolean,
  },
  components: {
    modal: () => import("../../components/ui/modal"),
  },
  data() {
    return {
      name: undefined,
    }
  },
  methods: {
    syncTeams() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[1].value) {
          fb.writeTeams(JSON.parse(JSON.stringify(this.$store.state.postwoman.teams)))
        }
      }
    },
    addNewTeam() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_team_name"))
        return
      }
      let newTeam = [
        {
          name: this.$data.name,
          members: [],
        },
      ]
      this.$store.commit("postwoman/importAddTeams", {
        teams: newTeam,
        confirmation: "Team added",
      })
      this.$emit("hide-modal")
      this.syncTeams()
    },
    hideModal() {
      this.$data.name = undefined
      this.$emit("hide-modal")
    },
  },
}
</script>
