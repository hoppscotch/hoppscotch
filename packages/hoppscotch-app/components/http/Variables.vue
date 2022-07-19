<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight"> Variables </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('add.new')"
          svg="plus"
          :disabled="bulkMode"
          @click.native="addParamV"
        />
      </div>
    </div>
    <div v-if="bulkMode" ref="bulkEditor" class="flex flex-col flex-1"></div>
    <div v-else>
      <div
        v-for="(param, index) in workingParamsV"
        :key="`param-${param.id}-${index}`"
        class="flex border-b divide-x divide-dividerLight border-dividerLight draggable-content group"
      >
        <SmartEnvInput
          v-model="param.key"
          :placeholder="`${t('count.parameter', { count: index + 1 })}`"
          @change="
            updateParamV(index, {
              id: param.id,
              key: $event,
              value: param.value,
              active: param.active,
            })
          "
        />
        <SmartEnvInput
          v-model="param.value"
          :placeholder="`${t('count.value', { count: index + 1 })}`"
          @change="
            updateParamV(index, {
              id: param.id,
              key: param.key,
              value: $event,
              active: param.active,
            })
          "
        />
        <span>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.remove')"
            svg="trash"
            color="red"
            @click.native="deleteParamV(index)"
          />
        </span>
      </div>
      <div
        v-if="workingParamsV.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <img
          :src="`/images/states/${$colorMode.value}/add_files.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
          :alt="`${t('empty.parameters')}`"
        />
        <span class="pb-4 text-center">{{ emptyVars }}</span>
        <ButtonSecondary
          :label="`${t('add.new')}`"
          svg="plus"
          filled
          class="mb-4"
          @click.native="addParamV"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "@nuxtjs/composition-api"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import { HoppRESTParam } from "@hoppscotch/data"
import cloneDeep from "lodash/cloneDeep"
import { useI18n, useToast } from "~/helpers/utils/composables"
import { throwError } from "~/helpers/functional/error"

const t = useI18n()
const toast = useToast()

const emptyVars: string = "Add a new variable"

const idTickerV = ref(0)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

// The UI representation of the parameters list (has the empty end param)
const workingParamsV = ref<Array<HoppRESTParam & { id: number }>>([
  {
    id: idTickerV.value++,
    key: "",
    value: "",
    active: true,
  },
])

// Rule: Working Params always have last element is always an empty param
watch(workingParamsV, (paramsList) => {
  if (paramsList.length > 0 && paramsList[paramsList.length - 1].key !== "") {
    workingParamsV.value.push({
      id: idTickerV.value++,
      key: "",
      value: "",
      active: true,
    })
  }
})

const addParamV = () => {
  workingParamsV.value.push({
    id: idTickerV.value++,
    key: "",
    value: "",
    active: true,
  })
}

const updateParamV = (index: number, param: HoppRESTParam & { id: number }) => {
  workingParamsV.value = workingParamsV.value.map((h, i) =>
    i === index ? param : h
  )
}

const deleteParamV = (index: number) => {
  const paramsBeforeDeletion = cloneDeep(workingParamsV.value)

  if (
    !(
      paramsBeforeDeletion.length > 0 &&
      index === paramsBeforeDeletion.length - 1
    )
  ) {
    if (deletionToast.value) {
      deletionToast.value.goAway(0)
      deletionToast.value = null
    }

    deletionToast.value = toast.success(`${t("state.deleted")}`, {
      action: [
        {
          text: `${t("action.undo")}`,
          onClick: (_, toastObject) => {
            workingParamsV.value = paramsBeforeDeletion
            toastObject.goAway(0)
            deletionToast.value = null
          },
        },
      ],

      onComplete: () => {
        deletionToast.value = null
      },
    })
  }

  workingParamsV.value = pipe(
    workingParamsV.value,
    A.deleteAt(index),
    O.getOrElseW(() => throwError("Working Params Deletion Out of Bounds"))
  )
}
</script>
