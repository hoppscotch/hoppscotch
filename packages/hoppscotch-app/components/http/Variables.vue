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
          @click.native="addVar"
        />
      </div>
    </div>
    <div>
      <div
        v-for="(vari, index) in workingVars"
        :key="`vari-${vari.id}-${index}`"
        class="flex border-b divide-x divide-dividerLight border-dividerLight draggable-content group"
      >
        <SmartEnvInput
          v-model="vari.key"
          :placeholder="`${t('count.parameter', { count: index + 1 })}`"
          @change="
            updateVar(index, {
              id: vari.id,
              key: $event,
              value: vari.value,
            })
          "
        />
        <SmartEnvInput
          v-model="vari.value"
          :placeholder="`${t('count.value', { count: index + 1 })}`"
          @change="
            updateVar(index, {
              id: vari.id,
              key: vari.key,
              value: $event,
            })
          "
        />
        <span>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.remove')"
            svg="trash"
            color="red"
            @click.native="deleteVar(index)"
          />
        </span>
      </div>
      <div
        v-if="workingVars.length === 0"
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
          @click.native="addVar"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Ref, ref, watch } from "@nuxtjs/composition-api"
import { flow, pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import { HoppRESTVar } from "@hoppscotch/data"
import cloneDeep from "lodash/cloneDeep"
import isEqual from "lodash/isEqual"
import { useI18n, useStream, useToast } from "~/helpers/utils/composables"
import { throwError } from "~/helpers/functional/error"
import { restVars$, setRESTVars } from "~/newstore/RESTSession"
import { objRemoveKey } from "~/helpers/functional/object"

const t = useI18n()
const toast = useToast()

const emptyVars: string = "Add a new variable"

const idTickerV = ref(0)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

const vars = useStream(restVars$, [], setRESTVars) as Ref<HoppRESTVar[]>

// The UI representation of the variables list (has the empty end variable)
const workingVars = ref<Array<HoppRESTVar & { id: number }>>([
  {
    id: idTickerV.value++,
    key: "",
    value: "",
  },
])

// Rule: Working vars always have last element is always an empty var
watch(workingVars, (varsList) => {
  if (varsList.length > 0 && varsList[varsList.length - 1].key !== "") {
    workingVars.value.push({
      id: idTickerV.value++,
      key: "",
      value: "",
    })
  }
})

watch(workingVars, (newWorkingVars) => {
  const fixedVars = pipe(
    newWorkingVars,
    A.filterMap(
      flow(
        O.fromPredicate((e) => e.key !== ""),
        O.map(objRemoveKey("id"))
      )
    )
  )

  if (!isEqual(vars.value, fixedVars)) {
    vars.value = cloneDeep(fixedVars)
  }
})

const addVar = () => {
  workingVars.value.push({
    id: idTickerV.value++,
    key: "",
    value: "",
  })
}

const updateVar = (index: number, vari: HoppRESTVar & { id: number }) => {
  workingVars.value = workingVars.value.map((h, i) => (i === index ? vari : h))
}

const deleteVar = (index: number) => {
  const varsBeforeDeletion = cloneDeep(workingVars.value)
  if (
    !(varsBeforeDeletion.length > 0 && index === varsBeforeDeletion.length - 1)
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
            workingVars.value = varsBeforeDeletion
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

  workingVars.value = pipe(
    workingVars.value,
    A.deleteAt(index),
    O.getOrElseW(() => throwError("Working Params Deletion Out of Bounds"))
  )
}
</script>
