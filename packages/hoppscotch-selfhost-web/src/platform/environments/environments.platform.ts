import { authEvents$, def as platformAuth } from "@platform/auth"
import {
  createEnvironment,
  deleteEnvironment,
  replaceEnvironments,
  setGlobalEnvVariables,
  updateEnvironment,
} from "@hoppscotch/common/newstore/environments"

import { EnvironmentsPlatformDef } from "@hoppscotch/common/src/platform/environments"
import { runGQLSubscription } from "@hoppscotch/common/helpers/backend/GQLClient"

import {
  environmentsMapper,
  globalEnvironmentMapper,
  environnmentsSyncer,
} from "@platform/environments/environments.sync"

import * as E from "fp-ts/Either"
import { runDispatchWithOutSyncing } from "@lib/sync"
import {
  createUserGlobalEnvironment,
  getGlobalEnvironments,
  getUserEnvironments,
  runUserEnvironmentCreatedSubscription,
  runUserEnvironmentDeletedSubscription,
  runUserEnvironmentUpdatedSubscription,
} from "@platform/environments/environments.api"

export function initEnvironmentsSync() {
  const currentUser$ = platformAuth.getCurrentUserStream()

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
      environments.forEach((env, index) => {
        environmentsMapper.addEntry(index, env.id)
      })

      runDispatchWithOutSyncing(() => {
        replaceEnvironments(
          environments.map(({ id, variables, name }) => ({
            id,
            name,
            variables: JSON.parse(variables),
          }))
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
      runDispatchWithOutSyncing(() => {
        setGlobalEnvVariables(JSON.parse(globalEnv.variables))
      })
      globalEnvironmentMapper.addEntry(0, globalEnv.id)
    }
  } else if (res.left.error == "user_environment/user_env_does_not_exists") {
    const res = await createUserGlobalEnvironment(JSON.stringify([]))

    if (E.isRight(res)) {
      const backendId = res.right.createUserGlobalEnvironment.id
      globalEnvironmentMapper.addEntry(0, backendId)
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
    console.group("Subscription: User Environment Created")
    console.log(res)
    console.groupEnd()

    if (E.isRight(res)) {
      const { name, variables } = res.right.userEnvironmentCreated

      if (name) {
        runDispatchWithOutSyncing(() => {
          createEnvironment(name, JSON.parse(variables))
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
    console.group("Subscription: User Environment Updated")
    console.log(res)
    console.groupEnd()

    if (E.isRight(res)) {
      const { name, variables, id, isGlobal } = res.right.userEnvironmentUpdated

      // handle the case for global environments
      if (isGlobal) {
        runDispatchWithOutSyncing(() => {
          setGlobalEnvVariables(JSON.parse(variables))
        })
      } else {
        // handle the case for normal environments

        const localIndex = environmentsMapper.getIndexByBackendId(id)

        if (localIndex && name) {
          runDispatchWithOutSyncing(() => {
            updateEnvironment(localIndex, {
              name,
              variables: JSON.parse(variables),
            })
          })
        }
      }
    }
  })

  return userEnvironmentUpdatedSub
}

function setupUserEnvironmentDeletedSubscription() {
  console.log("setting up user environments for user deleted")

  const [userEnvironmentDeleted$, userEnvironmentDeletedSub] =
    runUserEnvironmentDeletedSubscription()

  userEnvironmentDeleted$.subscribe((res) => {
    console.group("Subscription: User Environment Deleted")
    console.log(res)
    console.groupEnd()

    if (E.isRight(res)) {
      const { id } = res.right.userEnvironmentDeleted

      const localIndex = environmentsMapper.getIndexByBackendId(id)

      if (localIndex) {
        runDispatchWithOutSyncing(() => {
          deleteEnvironment(localIndex)
        })

        environmentsMapper.removeEntry(id)
      } else {
        console.log("could not find the localIndex")
        // TODO:
        // handle order of events
        // eg: update coming before create
        // skipping for this release
      }
    }
  })

  return userEnvironmentDeletedSub
}
