<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight"> My Variables </label>
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
      <draggable
        v-model="workingVars"
        animation="250"
        handle=".draggable-handle"
        draggable=".draggable-content"
        ghost-class="cursor-move"
        chosen-class="bg-primaryLight"
        drag-class="cursor-grabbing"
      >
        <div
          v-for="(variable, index) in workingVars"
          :key="`vari-${variable.id}-${index}`"
          class="flex border-b divide-x divide-dividerLight border-dividerLight draggable-content group"
        >
          <span>
            <ButtonSecondary
              svg="grip-vertical"
              class="cursor-auto text-primary hover:text-primary"
              :class="{
                'draggable-handle group-hover:text-secondaryLight !cursor-grab':
                  index !== workingVars?.length - 1,
              }"
              tabindex="-1"
            />
          </span>
          <SmartEnvInput
            v-model="variable.key"
            :placeholder="`${t('count.variable', { count: index + 1 })}`"
            @change="
              updateVar(index, {
                id: variable.id,
                key: $event,
                value: variable.value,
              })
            "
          />
          <SmartEnvInput
            v-model="variable.value"
            :placeholder="`${t('count.value', { count: index + 1 })}`"
            @change="
              updateVar(index, {
                id: variable.id,
                key: variable.key,
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
      </draggable>
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
import draggable from "vuedraggable"
import cloneDeep from "lodash/cloneDeep"
import isEqual from "lodash/isEqual"
import { useI18n, useStream, useToast } from "~/helpers/utils/composables"
import { throwError } from "~/helpers/functional/error"
import { restVars$, setRESTVars } from "~/newstore/RESTSession"
import { objRemoveKey } from "~/helpers/functional/object"

const t = useI18n()
const toast = useToast()

const emptyVars: string = "Add a new variable"

const idTicker = ref(0)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

// The functional variables list (the variables actually applied to the session)
const vars = useStream(restVars$, [], setRESTVars) as Ref<HoppRESTVar[]>

// The UI representation of the variables list (has the empty end variable)
const workingVars = ref<Array<HoppRESTVar & { id: number }>>([
  {
    id: idTicker.value++,
    key: "",
    value: "",
  },
])

// Rule: Working vars always have last element is always an empty var
watch(workingVars, (varsList) => {
  if (varsList.length > 0 && varsList[varsList.length - 1].key !== "") {
    workingVars.value.push({
      id: idTicker.value++,
      key: "",
      value: "",
    })
  }
})

// Sync logic between params and working/bulk params
watch(
  vars,
  (newVarsList) => {
    // Sync should overwrite working params
    const filteredWorkingVars: HoppRESTVar[] = pipe(
      workingVars.value,
      A.filterMap(
        flow(
          O.fromPredicate((e) => e.key !== ""),
          O.map(objRemoveKey("id"))
        )
      )
    )

    if (!isEqual(newVarsList, filteredWorkingVars)) {
      workingVars.value = pipe(
        newVarsList,
        A.map((x) => ({ id: idTicker.value++, ...x }))
      )
    }
  },
  { immediate: true }
)

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
    id: idTicker.value++,
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
