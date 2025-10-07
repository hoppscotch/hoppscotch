<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky top-upperMobileSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4 sm:top-upperSecondaryStickyFold"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("reusable_functions.title") }}
      </label>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('reusable_functions.add_function')"
          :icon="IconPlus"
          @click="addNewFunction"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear_all')"
          :icon="IconTrash2"
          @click="clearAllFunctions"
        />
      </div>
    </div>

    <div class="flex flex-1">
      <div class="w-1/3 border-r border-dividerLight">
        <div class="p-4">
          <div class="pb-2 text-secondaryLight">
            {{ t("reusable_functions.functions") }}
          </div>
          <div v-if="reusableFunctions.length === 0" class="text-center py-8 text-secondaryLight">
            {{ t("reusable_functions.no_functions") }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="func in reusableFunctions"
              :key="func.id"
              :class="[
                'p-3 rounded border cursor-pointer transition-colors',
                selectedFunction?.id === func.id
                  ? 'border-accent bg-primaryLight'
                  : 'border-dividerLight hover:border-dividerDark'
              ]"
              @click="selectFunction(func)"
            >
              <div class="flex items-center justify-between">
                <div class="truncate font-medium text-body">
                  {{ func.name }}
                </div>
                <div class="flex">
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('action.duplicate')"
                    :icon="IconCopy"
                    size="sm"
                    @click.stop="duplicateFunction(func.id)"
                  />
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('action.delete')"
                    :icon="IconTrash"
                    size="sm"
                    @click.stop="deleteFunction(func.id)"
                  />
                </div>
              </div>
              <div v-if="func.description" class="text-secondaryLight text-sm mt-1 truncate">
                {{ func.description }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col">
        <div v-if="!selectedFunction" class="flex-1 flex items-center justify-center text-secondaryLight">
          {{ t("reusable_functions.select_function") }}
        </div>
        <div v-else class="flex-1 flex flex-col">
          <div class="p-4 border-b border-dividerLight">
            <div class="space-y-3">
              <div>
                <label class="block text-secondaryLight text-sm mb-1">
                  {{ t("reusable_functions.function_name") }}
                </label>
                <HoppSmartInput
                  v-model="selectedFunction.name"
                  :placeholder="t('reusable_functions.enter_name')"
                  @update:modelValue="updateCurrentFunction"
                />
              </div>
              <div>
                <label class="block text-secondaryLight text-sm mb-1">
                  {{ t("reusable_functions.description") }}
                </label>
                <HoppSmartInput
                  v-model="selectedFunction.description"
                  :placeholder="t('reusable_functions.enter_description')"
                  @update:modelValue="updateCurrentFunction"
                />
              </div>
            </div>
          </div>

          <div class="flex-1 relative">
            <div ref="functionEditor" class="h-full absolute inset-0"></div>
          </div>

          <div class="p-4 border-t border-dividerLight bg-primaryLight">
            <div class="text-secondaryLight text-sm">
              <div class="font-medium mb-2">{{ t("reusable_functions.usage") }}</div>
              <div>{{ t("reusable_functions.usage_instruction_1") }}</div>
              <div class="font-mono text-xs bg-primary p-2 rounded mt-2">
                {{ selectedFunction.name.replace(/\s+/g, '') }}()
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { HoppReusableFunction, makeHoppReusableFunction } from "@hoppscotch/data"
import { computed, reactive, ref, watch } from "vue"
import {
  useReusableFunctions,
  addReusableFunction,
  removeReusableFunction,
  updateReusableFunction,
  duplicateReusableFunction,
  clearReusableFunctions
} from "~/newstore/reusableFunctions"
import IconPlus from "~icons/lucide/plus"
import IconTrash2 from "~icons/lucide/trash-2"
import IconTrash from "~icons/lucide/trash"
import IconCopy from "~icons/lucide/copy"

const t = useI18n()

const reusableFunctions = useReusableFunctions()
const selectedFunction = ref<HoppReusableFunction | null>(null)
const functionEditor = ref<any | null>(null)

const selectedFunctionCode = computed({
  get: () => selectedFunction.value?.code ?? "",
  set: (value: string) => {
    if (selectedFunction.value) {
      updateReusableFunction(selectedFunction.value.id, { code: value })
      selectedFunction.value.code = value
    }
  }
})

useCodemirror(
  functionEditor,
  selectedFunctionCode,
  reactive({
    extendedEditorConfig: {
      mode: "application/javascript",
      lineWrapping: true,
      placeholder: t("reusable_functions.enter_code"),
    },
    environmentHighlights: false,
    contextMenuEnabled: true,
  })
)

const selectFunction = (func: HoppReusableFunction) => {
  selectedFunction.value = { ...func }
}

const addNewFunction = () => {
  const newFunc = makeHoppReusableFunction({
    name: `Function ${reusableFunctions.value.length + 1}`,
    code: "function myFunction() {\n  return 'Hello, World!';\n}",
    description: "A new reusable function"
  })

  addReusableFunction(newFunc)
  selectedFunction.value = newFunc
}

const duplicateFunction = (functionId: string) => {
  duplicateReusableFunction(functionId)
}

const deleteFunction = (functionId: string) => {
  if (selectedFunction.value?.id === functionId) {
    selectedFunction.value = null
  }
  removeReusableFunction(functionId)
}

const clearAllFunctions = () => {
  selectedFunction.value = null
  clearReusableFunctions()
}

const updateCurrentFunction = () => {
  if (selectedFunction.value) {
    updateReusableFunction(selectedFunction.value.id, {
      name: selectedFunction.value.name,
      description: selectedFunction.value.description,
    })
  }
}

watch(() => selectedFunction.value?.id, () => {
  if (selectedFunction.value && functionEditor.value) {
    selectedFunctionCode.value = selectedFunction.value.code
  }
})
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperTertiaryStickyFold #{!important};
}
</style>