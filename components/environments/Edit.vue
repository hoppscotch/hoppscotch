<template>
  <SmartModal v-if="show" :title="$t('environment.edit')" @close="hideModal">
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
            :disabled="editingEnvironmentIndex === 'Global'"
            @keyup.enter="saveEnvironment"
          />
          <label for="selectLabelEnvEdit">
            {{ $t("action.label") }}
          </label>
        </div>
        <div class="flex flex-1 justify-between items-center">
          <label for="variableList" class="p-4">
            {{ $t("environment.variable_list") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('action.clear_all')"
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
              class="bg-primaryLight flex flex-1 py-2 px-4"
              :placeholder="$t('count.variable', { count: index + 1 })"
              :name="'param' + index"
            />
            <input
              v-model="variable.value"
              class="bg-primaryLight flex flex-1 py-2 px-4"
              :placeholder="$t('count.value', { count: index + 1 })"
              :name="'value' + index"
            />
            <div class="flex">
              <ButtonSecondary
                id="variable"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.remove')"
                icon="remove_circle_outline"
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
        <ButtonPrimary
          :label="$t('action.save')"
          @click.native="saveEnvironment"
        />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import clone from "lodash/clone"
import { computed, defineComponent, PropType } from "@nuxtjs/composition-api"
import {
  Environment,
  getEnviroment,
  getGlobalVariables,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"

export default defineComponent({
  props: {
    show: Boolean,
    editingEnvironmentIndex: {
      type: [Number, String] as PropType<number | "Global" | null>,
      default: null,
    },
  },
  setup(props) {
    const workingEnv = computed(() => {
      if (props.editingEnvironmentIndex === null) return null

      if (props.editingEnvironmentIndex === "Global") {
        return {
          name: "Global",
          variables: getGlobalVariables(),
        } as Environment
      } else {
        return getEnviroment(props.editingEnvironmentIndex)
      }
    })

    return {
      workingEnv,
    }
  },
  data() {
    return {
      name: null as string | null,
      vars: [] as { key: string; value: string }[],
      clearIcon: "clear_all",
    }
  },
  watch: {
    show() {
      this.name = this.workingEnv?.name ?? null
      this.vars = clone(this.workingEnv?.variables ?? [])
    },
  },
  methods: {
    clearContent() {
      this.vars = []
      this.clearIcon = "done"
      this.$toast.info(this.$t("state.cleared").toString(), {
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
        this.$toast.info(this.$t("environment.invalid_name").toString(), {
          icon: "info",
        })
        return
      }

      const environmentUpdated: Environment = {
        name: this.name,
        variables: this.vars,
      }

      if (this.editingEnvironmentIndex === "Global")
        setGlobalEnvVariables(environmentUpdated.variables)
      else updateEnvironment(this.editingEnvironmentIndex!, environmentUpdated)
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
