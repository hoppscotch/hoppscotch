<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_environment") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelEnvEdit" class="font-semibold px-4 pb-4">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelEnvEdit"
          v-model="name"
          class="input"
          type="text"
          :placeholder="editingEnvironment.name"
          @keyup.enter="saveEnvironment"
        />
        <div class="flex flex-1 justify-between items-center">
          <label for="variableList" class="font-semibold px-4 pt-4 pb-4">
            {{ $t("env_variable_list") }}
          </label>
          <div>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('clear')"
              :icon="clearIcon"
              @click.native="clearContent($event)"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              icon="add"
              :title="$t('add_new')"
              @click.native="addEnvironmentVariable"
            />
          </div>
        </div>
        <div class="border-divider border rounded">
          <div
            v-for="(variable, index) in vars"
            :key="`variable-${index}`"
            class="
              divide-x divide-dashed divide-divider
              border-b border-dashed border-divider
              flex
            "
            :class="{ 'border-t': index == 0 }"
          >
            <input
              v-model="variable.key"
              class="
                bg-primaryLight
                flex
                font-semibold font-mono
                flex-1
                py-2
                px-4
                focus:outline-none
              "
              :placeholder="$t('variable_count', { count: index + 1 })"
              :name="'param' + index"
            />
            <input
              v-model="variable.value"
              class="
                bg-primaryLight
                flex
                font-semibold font-mono
                flex-1
                py-2
                px-4
                focus:outline-none
              "
              :placeholder="$t('value_count', { count: index + 1 })"
              :name="'value' + index"
            />
            <div>
              <ButtonSecondary
                id="variable"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('delete')"
                icon="delete"
                color="red"
                @click.native="removeEnvironmentVariable(index)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="saveEnvironment" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
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
