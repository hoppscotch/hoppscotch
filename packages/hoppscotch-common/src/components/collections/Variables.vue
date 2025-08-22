<template>
  <div class="flex flex-col flex-1">
    <div class="flex flex-1 justify-between items-center pl-4">
      <span class="truncate font-semibold text-secondaryLight">{{
        t("environment.variable_list")
      }}</span>

      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        to="https://docs.hoppscotch.io/documentation/features/environments"
        blank
        :title="t('app.wiki')"
        :icon="IconHelpCircle"
      />
    </div>
    <div class="flex flex-col border border-divider rounded">
      <HoppSmartTabs v-model="selectedEnvOption" render-inactive-tabs>
        <template #actions>
          <div class="flex flex-1 items-center justify-between">
            <HoppButtonSecondary
              v-if="hasTeamWriteAccess"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="clearIcon"
              @click="clearContent()"
            />
            <HoppButtonSecondary
              v-if="hasTeamWriteAccess"
              v-tippy="{ theme: 'tooltip' }"
              :icon="IconPlus"
              :title="t('add.new')"
              @click="addEnvironmentVariable"
            />
            <tippy
              ref="options"
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions!.focus()"
            >
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.more')"
                :icon="IconMoreVertical"
              />
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  role="menu"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    v-if="hasTeamWriteAccess"
                    v-tippy="{ theme: 'tooltip' }"
                    :icon="IconCopyLeft"
                    :label="t('environment.replace_all_initial_with_current')"
                    @click="
                      () => {
                        vars.forEach((v) => {
                          v.initialValue = v.currentValue
                        })
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    v-tippy="{ theme: 'tooltip' }"
                    :icon="IconCopyRight"
                    :label="t('environment.replace_all_current_with_initial')"
                    @click="
                      () => {
                        vars.forEach((v) => {
                          v.currentValue = v.initialValue
                        })
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </tippy>
          </div>
        </template>

        <HoppSmartTab
          v-for="tab in tabsData"
          :id="tab.id"
          :key="tab.id"
          :label="tab.label"
        >
          <div class="divide-y divide-dividerLight">
            <HoppSmartPlaceholder
              v-if="tab.variables.length === 0"
              :src="`/images/states/${colorMode.value}/blockchain.svg`"
              :alt="tab.emptyStateLabel"
              :text="tab.emptyStateLabel"
            >
              <template #body>
                <HoppButtonSecondary
                  v-if="hasTeamWriteAccess"
                  :label="`${t('add.new')}`"
                  filled
                  :icon="IconPlus"
                  @click="addEnvironmentVariable"
                />
              </template>
            </HoppSmartPlaceholder>

            <template v-else>
              <div
                v-for="(env, index) in tab.variables"
                :key="`${tab.id}-${index}`"
                class="flex divide-x divide-dividerLight"
              >
                <input
                  v-model="env.key"
                  v-focus
                  class="flex flex-1 bg-transparent px-4 py-2 text-secondaryDark"
                  :placeholder="`${t('count.variable', {
                    count: index + 1,
                  })}`"
                  :name="'variable' + index"
                  :class="{
                    'opacity-25': !hasTeamWriteAccess,
                  }"
                  :disabled="!hasTeamWriteAccess"
                />
                <div class="flex items-center flex-1">
                  <SmartEnvInput
                    v-model="env.initialValue"
                    :placeholder="`${t('count.initialValue', { count: index + 1 })}`"
                    :envs="liveEnvs"
                    :auto-complete-env="true"
                    :name="'initialValue' + index"
                    :secret="tab.isSecret"
                    :readonly="!hasTeamWriteAccess"
                  />
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('environment.replace_initial_with_current')"
                    :icon="IconCopyLeft"
                    :disabled="!hasTeamWriteAccess"
                    @click="
                      () => {
                        env.initialValue = env.currentValue
                      }
                    "
                  />
                </div>

                <div class="flex items-center flex-1">
                  <SmartEnvInput
                    v-model="env.currentValue"
                    :placeholder="`${t('count.currentValue', { count: index + 1 })}`"
                    :envs="liveEnvs"
                    :auto-complete-env="true"
                    :name="'currentValue' + index"
                    :secret="tab.isSecret"
                  />
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('environment.replace_current_with_initial')"
                    :icon="IconCopyRight"
                    @click="
                      () => {
                        env.currentValue = env.initialValue
                      }
                    "
                  />
                </div>

                <div v-if="hasTeamWriteAccess" class="flex">
                  <HoppButtonSecondary
                    id="variable"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('action.remove')"
                    :icon="IconTrash"
                    color="red"
                    @click="removeEnvironmentVariable(index)"
                  />
                </div>
              </div>
            </template>
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </div>
  </div>
</template>

<script lang="ts" setup>
import IconDone from "~icons/lucide/check"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlus from "~icons/lucide/plus"
import IconTrash from "~icons/lucide/trash"
import IconTrash2 from "~icons/lucide/trash-2"
import IconCopyRight from "~icons/lucide/clipboard-paste"
import IconCopyLeft from "~icons/lucide/clipboard-copy"
import IconMoreVertical from "~icons/lucide/more-vertical"
import { computed, ComputedRef, Ref, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { useColorMode } from "~/composables/theming"
import { HoppCollectionVariable } from "@hoppscotch/data"
import { refAutoReset, useVModel } from "@vueuse/core"
import * as A from "fp-ts/Array"
import { pipe } from "fp-ts/function"
import { useReadonlyStream } from "~/composables/stream"
import {
  AggregateEnvironment,
  aggregateEnvsWithCurrentValue$,
} from "~/newstore/environments"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { transformInheritedCollectionVariablesToAggregateEnv } from "~/helpers/utils/inheritedCollectionVarTransformer"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const props = defineProps<{
  modelValue: HoppCollectionVariable[]
  inheritedProperties?: HoppInheritedProperty
  hasTeamWriteAccess: boolean
}>()

type SelectedEnv = "variables" | "secret"

const selectedEnvOption = ref<SelectedEnv>("variables")

const tippyActions = ref<HTMLDivElement | null>(null)

const vars = useVModel(props, "modelValue")

const secretVars = computed(() =>
  pipe(
    vars.value,
    A.filter((e) => e.secret)
  )
)

const nonSecretVars = computed(() =>
  pipe(
    vars.value,
    A.filter((e) => !e.secret)
  )
)

const tabsData: ComputedRef<
  {
    id: string
    label: string
    emptyStateLabel: string
    isSecret: boolean
    variables: HoppCollectionVariable[]
  }[]
> = computed(() => {
  return [
    {
      id: "variables",
      label: t("environment.variables"),
      emptyStateLabel: t("empty.collection_variables"),
      isSecret: false,
      variables: nonSecretVars.value,
    },
    {
      id: "secret",
      label: t("environment.secrets"),
      emptyStateLabel: t("empty.secret_environments"),
      isSecret: true,
      variables: secretVars.value,
    },
  ]
})

const clearIcon = refAutoReset<typeof IconTrash2 | typeof IconDone>(
  IconTrash2,
  1000
)

const aggregateEnvs = useReadonlyStream(
  aggregateEnvsWithCurrentValue$,
  []
) as Ref<AggregateEnvironment[]>

const liveEnvs = computed(() => {
  const parentInheritedVariables =
    transformInheritedCollectionVariablesToAggregateEnv(
      props.inheritedProperties?.variables ?? []
    )
  return [...parentInheritedVariables, ...aggregateEnvs.value]
})

const addEnvironmentVariable = () => {
  vars.value.push({
    key: "",
    currentValue: "",
    initialValue: "",
    secret: selectedEnvOption.value === "secret",
  })
}

const clearContent = () => {
  vars.value = vars.value.filter((e) =>
    selectedEnvOption.value === "secret" ? !e.secret : e.secret
  )

  clearIcon.value = IconDone
  toast.success(`${t("state.cleared")}`)
}

const removeEnvironmentVariable = (index: number) => {
  vars.value.splice(index, 1)
}
</script>
