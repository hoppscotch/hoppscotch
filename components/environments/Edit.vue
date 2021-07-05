<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_environment") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <label for="selectLabelEnvEdit">{{ $t("label") }}</label>
      <input
        id="selectLabelEnvEdit"
        v-model="name"
        class="input"
        type="text"
        :placeholder="editingEnvironment.name"
        @keyup.enter="saveEnvironment"
      />
      <div class="row-wrapper">
        <label for="variableList">{{ $t("env_variable_list") }}</label>
        <div>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('clear')"
            icon="clearIcon"
            @click.native="clearContent($event)"
          />
        </div>
      </div>
      <ul
        v-for="(variable, index) in vars"
        :key="index"
        class="
          border-b border-dashed
          divide-y
          md:divide-x
          border-divider
          divide-dashed divide-divider
          md:divide-y-0
        "
        :class="{ 'border-t': index == 0 }"
      >
        <li>
          <input
            v-model="variable.key"
            class="input"
            :placeholder="$t('variable_count', { count: index + 1 })"
            :name="'param' + index"
          />
        </li>
        <li>
          <input
            v-model="variable.value"
            class="input"
            :placeholder="$t('value_count', { count: index + 1 })"
            :name="'value' + index"
          />
        </li>
        <div>
          <li>
            <ButtonSecondary
              id="variable"
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('delete')"
              icon="delete"
              @click.native="removeEnvironmentVariable(index)"
            />
          </li>
        </div>
      </ul>
      <ul>
        <li>
          <ButtonSecondary
            icon="add"
            :label="$t('add_new')"
            @click.native="addEnvironmentVariable"
          />
        </li>
      </ul>
    </template>
    <template #footer>
      <span></span>
      <span>
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
        <ButtonPrimary :label="$t('save')" @click.native="saveEnvironment" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import Vue, { PropType } from "vue"
import clone from "lodash/clone"
import type { Environment } from "~/newstore/environments"
import { updateEnvironment } from "~/newstore/environments"

export default Vue.extend({
  props: {
    show: Boolean,
    editingEnvironment: {
      type: Object as PropType<Environment | null>,
      default: null,
    },
    editingEnvironmentIndex: { type: Number, default: null },
  },
  data() {
    return {
      name: null as string | null,
      vars: [] as { key: string; value: string }[],
      clearIcon: "clear_all",
    }
  },
  watch: {
    editingEnvironment() {
      this.name = this.editingEnvironment?.name ?? null
      this.vars = clone(this.editingEnvironment?.variables ?? [])
    },
    show() {
      this.name = this.editingEnvironment?.name ?? null
      this.vars = clone(this.editingEnvironment?.variables ?? [])
    },
  },
  methods: {
    clearContent() {
      this.vars = []
      this.clearIcon = "done"
      this.$toast.info(this.$t("cleared").toString(), {
        icon: "clear_all",
      })
      setTimeout(() => (this.clearIcon = "clear_all"), 1000)
    },
    addEnvironmentVariable() {
      this.vars.push({
        key: "",
        value: "",
      })
    },
    removeEnvironmentVariable(index: number) {
      this.vars.splice(index, 1)
    },
    saveEnvironment() {
      if (!this.name) {
        this.$toast.info(this.$t("invalid_environment_name").toString())
        return
      }

      const environmentUpdated: Environment = {
        name: this.name,
        variables: this.vars,
      }

      updateEnvironment(this.editingEnvironmentIndex, environmentUpdated)
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
