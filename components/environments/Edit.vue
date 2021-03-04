<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("edit_environment") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        type="text"
        id="selectLabel"
        v-model="name"
        :placeholder="editingEnvironment.name"
        @keyup.enter="saveEnvironment"
      />
      <div class="row-wrapper">
        <label for="variableList">{{ $t("env_variable_list") }}</label>
        <div>
          <button class="icon" @click="clearContent($event)" v-tooltip.bottom="$t('clear')">
            <i class="material-icons">clear_all</i>
          </button>
        </div>
      </div>
      <ul
        v-for="(variable, index) in this.editingEnvCopy.variables"
        :key="index"
        class="border-b border-dashed divide-y md:divide-x border-brdColor divide-dashed divide-brdColor md:divide-y-0"
        :class="{ 'border-t': index == 0 }"
      >
        <li>
          <input
            :placeholder="$t('variable_count', { count: index + 1 })"
            :name="'param' + index"
            :value="variable.key"
            @change="
              $store.commit('postwoman/setVariableKey', {
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
            :value="
              typeof variable.value === 'string' ? variable.value : JSON.stringify(variable.value)
            "
            @change="
              $store.commit('postwoman/setVariableValue', {
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
              @click="removeEnvironmentVariable(index)"
              v-tooltip.bottom="$t('delete')"
              id="variable"
            >
              <i class="material-icons">delete</i>
            </button>
          </li>
        </div>
      </ul>
      <ul>
        <li>
          <button class="icon" @click="addEnvironmentVariable">
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
          <button class="icon primary" @click="saveEnvironment">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  props: {
    show: Boolean,
    editingEnvironment: Object,
    editingEnvironmentIndex: Number,
  },
  data() {
    return {
      name: undefined,
      doneButton: '<i class="material-icons">done</i>',
    }
  },
  watch: {
    editingEnvironment(update) {
      this.name =
        this.$props.editingEnvironment && this.$props.editingEnvironment.name
          ? this.$props.editingEnvironment.name
          : undefined
      this.$store.commit("postwoman/setEditingEnvironment", this.$props.editingEnvironment)
    },
  },
  computed: {
    editingEnvCopy() {
      return this.$store.state.postwoman.editingEnvironment
    },
    variableString() {
      const result = this.editingEnvCopy.variables
      return result === "" ? "" : JSON.stringify(result)
    },
  },
  methods: {
    syncEnvironments() {
      if (fb.currentUser !== null && fb.currentSettings[1]) {
        if (fb.currentSettings[1].value) {
          fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
        }
      }
    },
    clearContent({ target }) {
      this.$store.commit("postwoman/removeVariables", [])
      target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(() => (target.innerHTML = '<i class="material-icons">clear_all</i>'), 1000)
    },
    addEnvironmentVariable() {
      let value = { key: "", value: "" }
      this.$store.commit("postwoman/addVariable", value)
      this.syncEnvironments()
    },
    removeEnvironmentVariable(index) {
      let variableIndex = index
      const oldVariables = this.editingEnvCopy.variables.slice()
      const newVariables = this.editingEnvCopy.variables.filter(
        (variable, index) => variableIndex !== index
      )

      this.$store.commit("postwoman/removeVariable", newVariables)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.$store.commit("postwoman/removeVariable", oldVariables)
            toastObject.remove()
          },
        },
      })
      this.syncEnvironments()
    },
    saveEnvironment() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_environment_name"))
        return
      }
      const environmentUpdated = {
        ...this.editingEnvCopy,
        name: this.$data.name,
      }
      this.$store.commit("postwoman/saveEnvironment", {
        environment: environmentUpdated,
        environmentIndex: this.$props.editingEnvironmentIndex,
      })
      this.$emit("hide-modal")
      this.syncEnvironments()
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$data.name = undefined
    },
  },
}
</script>
