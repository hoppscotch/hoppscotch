<template>
  <HoppSmartModal
    v-if="show"
    :title="t('environment.set_as_environment')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-1 flex-col space-y-4">
        <div class="ml-2 flex items-center space-x-8">
          <label for="name" class="min-w-[2.5rem] font-semibold">{{
            t("environment.name")
          }}</label>
          <input
            v-model="editingName"
            type="text"
            :placeholder="t('environment.variable')"
            class="input"
          />
        </div>
        <div class="ml-2 flex items-center space-x-8">
          <label for="value" class="min-w-[2.5rem] font-semibold">{{
            t("environment.value")
          }}</label>
          <SmartEnvInput
            v-model="editingValue"
            type="text"
            class="input"
            :placeholder="t('environment.value')"
          />
        </div>
        <div class="ml-2 flex items-center space-x-8">
          <label for="scope" class="min-w-[2.5rem] font-semibold">
            {{ t("environment.scope") }}
          </label>
          <div
            class="relative flex flex-1 flex-col rounded border border-divider focus-visible:border-dividerDark"
          >
            <EnvironmentsSelector
              v-model="scope"
              :is-scope-selector="true"
              :collection-scope="collectionScope"
            />
          </div>
        </div>
        <div v-if="replaceWithVariable" class="mt-3 flex space-x-2">
          <div class="min-w-[4rem]" />
          <HoppSmartCheckbox
            :on="replaceWithVariable"
            :title="t('environment.replace_with_variable')"
            @change="replaceWithVariable = !replaceWithVariable"
          />
          <label for="replaceWithVariable">
            {{ t("environment.replace_with_variable") }}</label
          >
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          outline
          @click="addEnvironment"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts" setup>
import { useService } from "dioc/vue"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { GQLError } from "~/helpers/backend/GQLClient"
import { updateTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import { getEnvActionErrorMessage } from "~/helpers/error-messages"
import {
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { RESTTabService } from "~/services/tab/rest"
import { Scope } from "./Selector.vue"
import { GlobalEnvironment } from "@hoppscotch/data"
import {
  addCollectionVariable,
  getRESTCollectionByRefId,
} from "~/newstore/collections"
import { updateTeamCollection } from "~/helpers/backend/mutations/TeamCollection"
import { teamCollToHoppRESTColl } from "~/helpers/backend/helpers"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { updateInheritedPropertiesForAffectedRequests } from "~/helpers/collection/collection"

const t = useI18n()
const toast = useToast()

const tabs = useService(RESTTabService)
const currentEnvironmentValueService = useService(CurrentValueService)
const teamCollectionService = useService(TeamCollectionsService)

const props = defineProps<{
  show: boolean
  position: { top: number; left: number }
  name: string
  value: string
  preferredScope?:
    | "global"
    | "my-environment"
    | "team-environment"
    | "collection"
  collection?:
    | {
        originLocation: "user-collection"
        collectionRefID: string
        collectionPath: string
        collectionName: string
      }
    | {
        originLocation: "team-collection"
        collectionID: string
        collectionName: string
      }
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => {
  emit("hide-modal")
}

const defaultScope = (): Scope => ({
  type: "global",
  variables: [],
})

const collectionScope = ref(props.collection)

watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      scope.value = defaultScope()
      replaceWithVariable.value = false
      editingName.value = ""
      editingValue.value = ""
      collectionScope.value = undefined
    } else {
      collectionScope.value = props.collection
      if (props.preferredScope === "collection" && props.collection) {
        scope.value = {
          type: "collection",
          ...props.collection,
        }
      }
    }
    editingName.value = props.name
    editingValue.value = props.value
  }
)

const scope = ref<Scope>(defaultScope())

const replaceWithVariable = ref(false)

const editingName = ref(props.name)
const editingValue = ref(props.value)

const findTeamCollectionByID = (
  collections: TeamCollection[],
  collectionID: string
): TeamCollection | null => {
  for (const collection of collections) {
    if (collection.id === collectionID) return collection

    const nestedCollection = collection.children
      ? findTeamCollectionByID(collection.children, collectionID)
      : null

    if (nestedCollection) return nestedCollection
  }

  return null
}

const addEnvironment = async () => {
  if (!editingName.value) {
    toast.error(`${t("environment.invalid_name")}`)
    return
  }
  if (scope.value.type === "collection") {
    if (scope.value.originLocation === "user-collection") {
      const targetCollection = getRESTCollectionByRefId(
        scope.value.collectionRefID
      )
      const hasDuplicateKey = (targetCollection?.variables ?? []).some(
        (variable) => variable.key === editingName.value
      )

      if (hasDuplicateKey) {
        toast.error(t("environment.collection_variable_exists"))
        return
      }

      addCollectionVariable(
        scope.value.collectionRefID,
        editingName.value,
        editingValue.value
      )
      updateInheritedPropertiesForAffectedRequests(
        scope.value.collectionPath,
        "rest"
      )

      toast.success(`${t("environment.updated")}`)
    } else {
      const collectionID = scope.value.collectionID
      // Normalize to leaf ID: saveContext stores full paths like "rootID/childID",
      // but the tree lookup and backend call need only the actual collection ID.
      const leafCollectionID = collectionID.split("/").pop() ?? collectionID
      const teamCollection = findTeamCollectionByID(
        teamCollectionService.collections.value,
        leafCollectionID
      )

      if (!teamCollection) {
        toast.error(`${t("error.something_went_wrong")}`)
        return
      }

      const collectionData = teamCollToHoppRESTColl(teamCollection)
      const hasDuplicateKey = (collectionData.variables ?? []).some(
        (variable) => variable.key === editingName.value
      )

      if (hasDuplicateKey) {
        toast.error(t("environment.collection_variable_exists"))
        return
      }

      const updatedVariables = [
        ...(collectionData.variables ?? []),
        {
          key: editingName.value,
          initialValue: editingValue.value,
          currentValue: editingValue.value,
          secret: false,
        },
      ]

      await pipe(
        updateTeamCollection(leafCollectionID, {
          auth: collectionData.auth,
          headers: collectionData.headers,
          variables: updatedVariables,
          description: collectionData.description ?? null,
        }),
        TE.match(
          (err: GQLError<string>) => {
            console.error(err)
            toast.error(t(getEnvActionErrorMessage(err)))
          },
          () => {
            updateInheritedPropertiesForAffectedRequests(collectionID, "rest")
            toast.success(`${t("environment.updated")}`)
          }
        )
      )()
    }
  } else if (scope.value.type === "global") {
    const newVariables = [
      ...scope.value.variables,
      {
        key: editingName.value,
        initialValue: editingValue.value,
        currentValue: "",
        secret: false,
      },
    ]

    const newEnv: GlobalEnvironment = {
      v: 2,
      variables: newVariables,
    }

    setGlobalEnvVariables(newEnv)
    currentEnvironmentValueService.addEnvironmentVariable("Global", {
      key: editingName.value,
      currentValue: editingValue.value,
      isSecret: false,
      varIndex: scope.value.variables.length,
    })
    toast.success(`${t("environment.updated")}`)
  } else if (scope.value.type === "my-environment") {
    const newVariables = [
      ...scope.value.environment.variables,
      {
        key: editingName.value,
        initialValue: editingValue.value,
        currentValue: "",
        secret: false,
      },
    ]

    const newEnv = {
      ...scope.value.environment,
      variables: newVariables,
    }

    updateEnvironment(scope.value.index, newEnv)
    currentEnvironmentValueService.addEnvironmentVariable(
      scope.value.environment.id,
      {
        key: editingName.value,
        currentValue: editingValue.value,
        isSecret: false,
        varIndex: scope.value.environment.variables.length,
      }
    )
    toast.success(`${t("environment.updated")}`)
  } else {
    const newVariables = [
      ...scope.value.environment.environment.variables,
      {
        key: editingName.value,
        initialValue: editingValue.value,
        currentValue: "",
        secret: false,
      },
    ]

    await pipe(
      updateTeamEnvironment(
        JSON.stringify(newVariables),
        scope.value.environment.id,
        scope.value.environment.environment.name
      ),
      TE.match(
        (err: GQLError<string>) => {
          console.error(err)
          toast.error(t(getEnvActionErrorMessage(err)))
        },
        () => {
          if (scope.value.type === "team-environment") {
            currentEnvironmentValueService.addEnvironmentVariable(
              scope.value.environment.id,
              {
                key: editingName.value,
                currentValue: editingValue.value,
                isSecret: false,
                varIndex:
                  scope.value.environment.environment.variables.length - 1,
              }
            )
          }
          hideModal()
          toast.success(`${t("environment.updated")}`)
        }
      )
    )()
  }
  if (replaceWithVariable.value) {
    //replace the current tab endpoint with the variable name with << and >>
    const variableName = `<<${editingName.value}>>`
    //replace the currenttab endpoint containing the value in the text with variablename
    tabs.currentActiveTab.value.document.request.endpoint =
      tabs.currentActiveTab.value.document.request.endpoint.replace(
        editingValue.value,
        variableName
      )
  }

  hideModal()
}
</script>
