import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import {
  reactive,
  ref,
  Ref,
  unref,
  isRef,
  watchEffect,
  WatchStopHandle,
  watchSyncEffect,
  watch,
} from "vue"
import {
  client,
  GQLError,
  parseGQLErrorString,
} from "@helpers/backend/GQLClient"
import {
  createRequest,
  GraphQLRequest,
  OperationResult,
  TypedDocumentNode,
} from "@urql/core"
import { Source, pipe as wonkaPipe, onEnd, subscribe } from "wonka"

type MaybeRef<X> = X | Ref<X>

type UseQueryOptions<T = any, V = object> = {
  query: TypedDocumentNode<T, V>
  variables?: MaybeRef<V>

  updateSubs?: MaybeRef<GraphQLRequest<any, object>[]>
  defer?: boolean
  pollDuration?: number | undefined
}

export const useGQLQuery = <DocType, DocVarType, DocErrorType extends string>(
  _args: UseQueryOptions<DocType, DocVarType>
) => {
  const stops: WatchStopHandle[] = []

  const args = reactive(_args)

  const loading: Ref<boolean> = ref(true)
  const isStale: Ref<boolean> = ref(true)
  const data: Ref<E.Either<GQLError<DocErrorType>, DocType>> = ref() as any

  if (!args.updateSubs) args.updateSubs = []

  const isPaused: Ref<boolean> = ref(args.defer ?? false)

  const pollDuration: Ref<number | null> = ref(args.pollDuration ?? null)

  const request: Ref<GraphQLRequest<DocType, DocVarType>> = ref(
    createRequest<DocType, DocVarType>(
      args.query,
      unref<DocVarType>(args.variables as any) as any
    )
  ) as any

  const source: Ref<Source<OperationResult> | undefined> = ref()

  // Toggles between true and false to cause the polling operation to tick
  const pollerTick: Ref<boolean> = ref(true)

  stops.push(
    watchEffect((onInvalidate) => {
      if (pollDuration.value !== null && !isPaused.value) {
        const handle = setInterval(() => {
          pollerTick.value = !pollerTick.value
        }, pollDuration.value)

        onInvalidate(() => {
          clearInterval(handle)
        })
      }
    })
  )

  stops.push(
    watchEffect(
      () => {
        const newRequest = createRequest<DocType, DocVarType>(
          args.query,
          unref<DocVarType>(args.variables as any) as any
        )

        if (request.value.key !== newRequest.key) {
          request.value = newRequest
        }
      },
      { flush: "pre" }
    )
  )

  const rerunQuery = () => {
    source.value = !isPaused.value
      ? client.value.executeQuery<DocType, DocVarType>(request.value, {
          requestPolicy: "network-only",
        })
      : undefined
  }

  stops.push(
    watch(
      pollerTick,
      () => {
        rerunQuery()
      },
      {
        flush: "pre",
      }
    )
  )

  watchSyncEffect((onInvalidate) => {
    if (source.value) {
      loading.value = true
      isStale.value = false

      const invalidateStops = args.updateSubs!.map((sub) => {
        return wonkaPipe(
          client.value.executeSubscription(sub),
          onEnd(() => {
            if (source.value) execute()
          }),
          subscribe(() => {
            return execute()
          })
        ).unsubscribe
      })

      invalidateStops.push(
        wonkaPipe(
          source.value,
          onEnd(() => {
            loading.value = false
            isStale.value = false
          }),
          subscribe((res) => {
            if (res.operation.key === request.value.key) {
              data.value = pipe(
                // The target
                res.data as DocType | undefined,
                // Define what happens if data does not exist (it is an error)
                E.fromNullable(
                  pipe(
                    // Take the network error value
                    res.error?.networkError,
                    // If it null, set the left to the generic error name
                    E.fromNullable(res.error?.message),
                    E.match(
                      // The left case (network error was null)
                      (gqlErr) =>
                        <GQLError<DocErrorType>>{
                          type: "gql_error",
                          error: parseGQLErrorString(
                            gqlErr ?? ""
                          ) as DocErrorType,
                        },
                      // The right case (it was a GraphQL Error)
                      (networkErr) =>
                        <GQLError<DocErrorType>>{
                          type: "network_error",
                          error: networkErr,
                        }
                    )
                  )
                )
              )
              loading.value = false
            }
          })
        ).unsubscribe
      )

      onInvalidate(() => invalidateStops.forEach((unsub) => unsub()))
    }
  })

  const execute = (updatedVars?: DocVarType) => {
    if (updatedVars) {
      if (isRef(args.variables)) {
        args.variables.value = updatedVars
      } else {
        args.variables = updatedVars
      }
    }

    isPaused.value = false
    rerunQuery()
  }

  const pause = () => {
    isPaused.value = true
  }

  const unpause = () => {
    isPaused.value = false
  }

  const response = reactive({
    loading,
    data,
    pause,
    unpause,
    isStale,
    execute,
  })

  return response
}
