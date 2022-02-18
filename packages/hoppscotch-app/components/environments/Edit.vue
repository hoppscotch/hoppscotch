<template>
  <SmartModal
    v-if="show"
    :title="`${$t('environment.edit')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <div class="relative flex">
          <input
            id="selectLabelEnvEdit"
            v-model="name"
            v-focus
            class="input floating-input"
            placeholder=" "
            type="text"
            autocomplete="off"
            :disabled="editingEnvironmentIndex === 'Global'"
            @keyup.enter="saveEnvironment"
          />
          <label for="selectLabelEnvEdit">
            {{ $t("action.label") }}
          </label>
        </div>
        <div class="flex items-center justify-between flex-1">
          <label for="variableList" class="p-4">
            {{ $t("environment.variable_list") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('action.clear_all')"
              :svg="clearIcon"
              @click.native="clearContent()"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              svg="plus"
              :title="$t('add.new')"
              @click.native="addEnvironmentVariable"
            />
          </div>
        </div>
        <div
          v-if="evnExpandError"
          class="w-full px-4 py-2 mb-2 overflow-auto font-mono text-red-400 whitespace-normal rounded bg-primaryLight"
        >
          {{ $t("environment.nested_overflow") }}
        </div>
        <div class="border rounded divide-y divide-dividerLight border-divider">
          <div
            v-for="(variable, index) in vars"
            :key="`variable-${index}`"
            class="flex divide-x divide-dividerLight"
          >
            <input
              v-model="variable.key"
              class="flex flex-1 px-4 py-2 bg-transparent"
              :placeholder="`${$t('count.variable', { count: index + 1 })}`"
              :name="'param' + index"
            />
            <SmartEnvInput
              v-model="variable.value"
              :placeholder="`${$t('count.value', { count: index + 1 })}`"
              :envs="liveEnvs"
              :name="'value' + index"
            />
            <div class="flex">
              <ButtonSecondary
                id="variable"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.remove')"
                svg="trash"
                color="red"
                @click.native="removeEnvironmentVariable(index)"
              />
            </div>
          </div>
          <div
            v-if="vars.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${$colorMode.value}/blockchain.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
              :alt="`${$t('empty.environments')}`"
            />
            <span class="pb-4 text-center">
              {{ $t("empty.environments") }}
            </span>
            <ButtonSecondary
              :label="`${$t('add.new')}`"
              filled
              class="mb-4"
              @click.native="addEnvironmentVariable"
            />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${$t('action.save')}`"
          @click.native="saveEnvironment"
        />
        <ButtonSecondary
          :label="`${$t('action.cancel')}`"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import clone from "lodash/clone"
import { computed, defineComponent, PropType } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { Environment, parseTemplateStringE } from "@hoppscotch/data"
import {
  getEnviroment,
  getGlobalVariables,
  globalEnv$,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"
import { useReadonlyStream } from "~/helpers/utils/composables"

export default defineComponent({
  props: {
    show: Boolean,
    editingEnvironmentIndex: {
      type: [Number, String] as PropType<number | "Global" | null>,
      default: null,
    },
  },
  setup(props) {
    const globalVars = useReadonlyStream(globalEnv$, [])

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
      globalVars,
      workingEnv,
    }
  },
  data() {
    return {
      name: null as string | null,
      vars: [] as { key: string; value: string }[],
      clearIcon: "trash-2",
    }
  },
  computed: {
    evnExpandError(): boolean {
      for (const variable of this.vars) {
        const result = parseTemplateStringE(variable.value, this.vars)

        if (E.isLeft(result)) {
          console.error("error", result.left)
          return true
        }
      }
      return false
    },
    liveEnvs(): Array<{ key: string; value: string; source: string }> {
      if (this.evnExpandError) {
        return []
      }

      if (this.$props.editingEnvironmentIndex === "Global") {
        return [...this.vars.map((x) => ({ ...x, source: this.name! }))]
      } else {
        return [
          ...this.vars.map((x) => ({ ...x, source: this.name! })),
          ...this.globalVars.map((x) => ({ ...x, source: "Global" })),
        ]
      }
    },
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
      this.clearIcon = "check"
      this.$toast.success(`${this.$t("state.cleared")}`)
      setTimeout(() => (this.clearIcon = "trash-2"), 1000)
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
        this.$toast.error(`${this.$t("environment.invalid_name")}`)
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
