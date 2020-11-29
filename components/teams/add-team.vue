<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="row-wrapper">
            <h3 class="title">{{ $t("new_team") }}</h3>
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
            :placeholder="$t('my_new_team')"
            @keyup.enter="addNewTeam"
          />
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
          <button class="icon primary" @click="addNewTeam">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from "~/helpers/fb"
import closeIcon from "~/static/icons/close-24px.svg?inline"

export default {
  props: {
    show: Boolean,
  },
  components: {
    closeIcon,
  },
  data() {
    return {
      name: undefined,
    }
  },
  methods: {
    addNewTeam() {
      console.log("addNewTeam")
    },
    hideModal() {
      this.$data.name = undefined
      this.$emit("hide-modal")
    },
  },
}
</script>
