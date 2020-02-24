<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">{{ $t("edit_environment") }}</h3>
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
            :placeholder="editingEnvironment.name"
            @keyup.enter="saveEnvironment"
          />
        </li>
      </ul>
      <ul>
        <li>
          <div class="flex-wrap">
            <label for="variableList">{{ $t("env_variable_list") }}</label>
            <div>
              <button
                class="icon"
                @click="clearContent($event)"
                v-tooltip.bottom="$t('clear')"
              >
                <i class="material-icons">clear_all</i>
              </button>
            </div>
          </div>
          <textarea
            id="variableList"
            readonly
            v-textarea-auto-height="variableString"
            v-model="variableString"
            :placeholder="$t('add_one_variable')"
            rows="1"
          ></textarea>
        </li>
      </ul>
      <ul
        v-for="(variable, index) in this.editingEnvCopy.variables"
        :key="index"
      >
        <li>
          <input
            :placeholder="$t('parameter_count', { count: index + 1 })"
            :name="'param' + index"
            :value="variable.key"
            @change="
              $store.commit('postwoman/setVariableKey', {
                index,
                value: $event.target.value
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
              typeof variable.value === 'string'
              ? variable.value
              : JSON.stringify(variable.value)
            "
            @change="
              $store.commit('postwoman/setVariableValue', {
                index,
                value: $event.target.value
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
      <div class="flex-wrap">
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
  </modal>
</template>

<script>
import textareaAutoHeight from "../../directives/textareaAutoHeight";

export default {
  directives: {
    textareaAutoHeight
  },
  props: {
    show: Boolean,
    editingEnvironment: Object,
    editingEnvironmentIndex: Number
  },
  components: {
    modal: () => import("../../components/modal")
  },
  data() {
    return {
      name: undefined
    };
  },
  watch: {
    editingEnvironment: function(update) {
      this.name = this.$props.editingEnvironment && this.$props.editingEnvironment.name
      ? this.$props.editingEnvironment.name
      : undefined
      this.$store.commit(
        "postwoman/setEditingEnvironment",
        this.$props.editingEnvironment
      );
    }
  },
  computed: {
    editingEnvCopy() {
      return this.$store.state.postwoman.editingEnvironment;
    },
    variableString() {
      const result = this.editingEnvCopy.variables;
      return result === "" ? "" : JSON.stringify(result);
    }
  },
  methods: {
    clearContent(e) {
      this.$store.commit("postwoman/removeVariables", []);
      e.target.innerHTML = this.doneButton;
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all"
      });
      setTimeout(
        () => (e.target.innerHTML = '<i class="material-icons">clear_all</i>'),
        1000
      );
    },
    addEnvironmentVariable() {
      let value = { key: "", value: "" };
      this.$store.commit("postwoman/addVariable", value);
    },
    removeEnvironmentVariable(index) {
      let variableIndex = index;
      const oldVariables = this.editingEnvCopy.variables.slice();
      const newVariables = this.editingEnvCopy.variables.filter(
        (variable, index) => variableIndex !== index
      );

      this.$store.commit("postwoman/removeVariable", newVariables);
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.$store.commit("postwoman/removeVariable", oldVariables);
            toastObject.remove();
          }
        }
      });
    },
    saveEnvironment() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_environment_name"));
        return;
      }
      const environmentUpdated = {
        ...this.editingEnvCopy,
        name: this.$data.name
      };
      this.$store.commit("postwoman/saveEnvironment", {
        environment: environmentUpdated,
        environmentIndex: this.$props.editingEnvironmentIndex
      });
      this.$emit("hide-modal");
    },
    hideModal() {
      this.$data.name = undefined;
      this.$emit("hide-modal");
    }
  }
};
</script>
