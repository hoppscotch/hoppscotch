import * as E from "fp-ts/Either"
import { entityReference } from "verzod"

import {
  createEnvironment,
  deleteEnvironment,
  environmentsStore,
  getLocalIndexByEnvironmentID,
  replaceEnvironments,
  setGlobalEnvID,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"

import { runGQLSubscription } from "~/helpers/backend/GQLClient"
import { EnvironmentsPlatformDef } from "~/platform/environments"

import { environnmentsSyncer } from "./sync"

import {
  Environment,
  EnvironmentSchemaVersion,
  GlobalEnvironment,
  GlobalEnvironmentSchemaVersion,
} from "@hoppscotch/data"
import { platform } from "~/platform"
import { runDispatchWithOutSyncing } from ".."
import {
  createUserGlobalEnvironment,
  getGlobalEnvironments,
  getUserEnvironments,
  runUserEnvironmentCreatedSubscription,
  runUserEnvironmentDeletedSubscription,
  runUserEnvironmentUpdatedSubscription,
} from "./api"

function initEnvironmentsSync() {
  const authEvents$ = platform.auth.getAuthEventsStream()
  const currentUser$ = platform.auth.getCurrentUserStream()

  environnmentsSyncer.startStoreSync()
  environnmentsSyncer.setupSubscriptions(setupSubscriptions)

  currentUser$.subscribe(async (user) => {
    if (user) {
      await loadAllEnvironments()
    }
  })

  authEvents$.subscribe((event) => {
    if (event.event == "login" || event.event == "token_refresh") {
      environnmentsSyncer.startListeningToSubscriptions()
    }

    if (event.event == "logout") {
      environnmentsSyncer.stopListeningToSubscriptions()
    }
  })
}

export const def: EnvironmentsPlatformDef = {
  initEnvironmentsSync,
}

function setupSubscriptions() {
  let subs: ReturnType<typeof runGQLSubscription>[1][] = []

  const userEnvironmentCreatedSub = setupUserEnvironmentCreatedSubscription()
  const userEnvironmentUpdatedSub = setupUserEnvironmentUpdatedSubscription()
  const userEnvironmentDeletedSub = setupUserEnvironmentDeletedSubscription()

  subs = [
    userEnvironmentCreatedSub,
    userEnvironmentUpdatedSub,
    userEnvironmentDeletedSub,
  ]

  return () => {
    subs.forEach((sub) => sub.unsubscribe())
  }
}

async function loadUserEnvironments() {
  const res = await getUserEnvironments()

  if (E.isRight(res)) {
    const environments = res.right.me.environments

    if (environments.length > 0) {
      runDispatchWithOutSyncing(() => {
        const formatedEnvironments = environments.map(
          (env) =>
            <Environment>{
              id: env.id,
              name: env.name,
              variables: JSON.parse(env.variables),
            }
        )

        replaceEnvironments(
          formatedEnvironments.map((environment) => {
            const parsedEnv = Environment.safeParse(environment)

            return parsedEnv.type === "ok"
              ? parsedEnv.value
              : {
                  ...environment,
                  v: EnvironmentSchemaVersion,
                }
          })
        )
      })
    }
  }
}

async function loadGlobalEnvironments() {
  const res = await getGlobalEnvironments()

  if (E.isRight(res)) {
    const globalEnv = res.right.me.globalEnvironments

    if (globalEnv) {
      const parsed = JSON.parse(globalEnv.variables)

      // Parse ladder: wrapper → wrap-bare-array → empty wrapper.
      let result = entityReference(GlobalEnvironment).safeParse(parsed)

      if (!result.success && Array.isArray(parsed)) {
        result = entityReference(GlobalEnvironment).safeParse({
          v: GlobalEnvironmentSchemaVersion,
          variables: parsed,
        })
      }

      runDispatchWithOutSyncing(() => {
        setGlobalEnvVariables(
          result.success
            ? result.data
            : { v: GlobalEnvironmentSchemaVersion, variables: [] }
        )
        setGlobalEnvID(globalEnv.id)
      })
    }
  } else if (res.left.error == "user_environment/global_env_does_not_exist") {
    const res = await createUserGlobalEnvironment(JSON.stringify([]))

    if (E.isRight(res)) {
      const backendId = res.right.createUserGlobalEnvironment.id
      setGlobalEnvID(backendId)
    }
  }
}

async function loadAllEnvironments() {
  await loadUserEnvironments()
  await loadGlobalEnvironments()
}

function setupUserEnvironmentCreatedSubscription() {
  const [userEnvironmentCreated$, userEnvironmentCreatedSub] =
    runUserEnvironmentCreatedSubscription()

  userEnvironmentCreated$.subscribe((res) => {
    if (E.isRight(res)) {
      const { name, variables, id } = res.right.userEnvironmentCreated

      const isAlreadyExisting = environmentsStore.value.environments.some(
        (env) => env.id == id
      )

      if (name && !isAlreadyExisting) {
        runDispatchWithOutSyncing(() => {
          createEnvironment(name, JSON.parse(variables), id)
        })
      }
    }
  })

  return userEnvironmentCreatedSub
}

function setupUserEnvironmentUpdatedSubscription() {
  const [userEnvironmentUpdated$, userEnvironmentUpdatedSub] =
    runUserEnvironmentUpdatedSubscription()

  userEnvironmentUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const { name, variables, id, isGlobal } = res.right.userEnvironmentUpdated

      // handle the case for global environments
      if (isGlobal) {
        runDispatchWithOutSyncing(() => {
          const parsed = JSON.parse(variables)

          // Mirror the load path: try as-is first (so v0 bare arrays still
          // migrate via verzod), only wrap a bare array as a v2 envelope
          // when the as-is parse fails (the broken-intermediate-state case).
          let result = entityReference(GlobalEnvironment).safeParse(parsed)
          if (!result.success && Array.isArray(parsed)) {
            result = entityReference(GlobalEnvironment).safeParse({
              v: GlobalEnvironmentSchemaVersion,
              variables: parsed,
            })
          }

          setGlobalEnvVariables(
            result.success ? result.data : { v: 2, variables: [] }
          )
        })
      } else {
        // handle the case for normal environments

        const localIndex = environmentsStore.value.environments.findIndex(
          (env) => env.id == id
        )

        if (localIndex !== -1 && name) {
          const environment = {
            id,
            name,
            variables: JSON.parse(variables),
          }

          const parsedEnvResult = Environment.safeParse(environment)

          const parsedEnv: Environment =
            parsedEnvResult.type === "ok"
              ? parsedEnvResult.value
              : {
                  ...environment,
                  v: EnvironmentSchemaVersion,
                }

          runDispatchWithOutSyncing(() => {
            updateEnvironment(localIndex, parsedEnv)
          })
        }
      }
    }
  })

  return userEnvironmentUpdatedSub
}

function setupUserEnvironmentDeletedSubscription() {
  const [userEnvironmentDeleted$, userEnvironmentDeletedSub] =
    runUserEnvironmentDeletedSubscription()

  userEnvironmentDeleted$.subscribe((res) => {
    if (E.isRight(res)) {
      const { id } = res.right.userEnvironmentDeleted

      // TODO: move getLocalIndexByID to a getter in the environmentsStore
      const localIndex = getLocalIndexByEnvironmentID(id)

      if (localIndex !== null) {
        runDispatchWithOutSyncing(() => {
          deleteEnvironment(localIndex)
        })
      }
    }
  })

  return userEnvironmentDeletedSub
}
