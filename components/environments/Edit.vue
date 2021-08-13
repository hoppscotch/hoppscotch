<template>
  <SmartModal v-if="show" :title="$t('edit_environment')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <div class="flex relative">
          <input
            id="selectLabelEnvEdit"
            v-model="name"
            v-focus
            class="input floating-input"
            placeholder=" "
            type="text"
            @keyup.enter="saveEnvironment"
          />
          <label for="selectLabelEnvEdit">
            {{ $t("label") }}
          </label>
        </div>
        <div class="flex flex-1 justify-between items-center">
          <label for="variableList" class="p-4">
            {{ $t("env_variable_list") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('clear')"
              :icon="clearIcon"
              class="rounded"
              @click.native="clearContent()"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              icon="add"
              :title="$t('add.new')"
              class="rounded"
              @click.native="addEnvironmentVariable"
            />
          </div>
        </div>
        <div class="divide-y divide-dividerLight border-divider border rounded">
          <div
            v-for="(variable, index) in vars"
            :key="`variable-${index}`"
            class="divide-x divide-dividerLight flex"
          >
            <input
              v-model="variable.key"
              class="
                bg-primaryLight
                flex flex-1
                py-2
                px-4
                truncate
                focus:outline-none
              "
              :placeholder="$t('count.variable', { count: index + 1 })"
              :name="'param' + index"
            />
            <input
              v-model="variable.value"
              class="
                bg-primaryLight
                flex flex-1
                py-2
                px-4
                truncate
                focus:outline-none
              "
              :placeholder="$t('count.value', { count: index + 1 })"
              :name="'value' + index"
            />
            <div class="flex">
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
          <div
            v-if="vars.length === 0"
            class="
              flex flex-col
              text-secondaryLight
              p-4
              items-center
              justify-center
            "
          >
            <i class="opacity-75 pb-2 material-icons">layers</i>
            <span class="text-center pb-4">
              {{ $t("empty.environments") }}
            </span>
            <ButtonSecondary
              :label="$t('add.new')"
              outline
              @click.native="addEnvironmentVariable"
            />
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
        this.$toast.info(this.$t("invalid_environment_name").toString(), {
          icon: "info",
        })
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
