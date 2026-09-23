import { parseTemplateString } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { computed, ref, watch, type Ref } from "vue"
import type { HoppGRPCDocument } from "~/helpers/grpc/document"
import {
  encodeGRPCRequestBody,
  executeGRPCUnary,
  findGRPCMethod,
  getDefaultGRPCRequestBody,
  isUnaryGRPCMethod,
  parseGRPCProtoFiles,
  supportsGRPC,
  type ParsedGRPCSchema,
} from "~/helpers/grpc"
import { getCombinedEnvVariables } from "~/helpers/utils/environments"
import { useService } from "dioc/vue"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

export function useGRPCRequest(document: Ref<HoppGRPCDocument>) {
  const interceptor = useService(KernelInterceptorService)
  const schema = ref<ParsedGRPCSchema | null>(null)
  const schemaError = ref("")
  const isParsing = ref(false)
  const isLoading = ref(false)
  let cancelCurrent: (() => Promise<void>) | null = null
  let parseSequence = 0
  let invocationSequence = 0

  watch(
    () => document.value.request.protoFiles,
    async (files) => {
      const sequence = ++parseSequence
      schema.value = null
      schemaError.value = ""
      if (!files.length) return
      isParsing.value = true
      try {
        const parsed = await parseGRPCProtoFiles(files)
        if (sequence !== parseSequence) return
        schema.value = parsed
        const request = document.value.request
        const service =
          parsed.services.find((item) => item.name === request.service) ??
          parsed.services[0]
        const method =
          service.methods.find((item) => item.methodName === request.method) ??
          service.methods.find(isUnaryGRPCMethod) ??
          service.methods[0]
        request.service = service.name
        request.method = method?.methodName ?? ""
        if (method && (!request.body.trim() || request.body.trim() === "{}")) {
          request.body = getDefaultGRPCRequestBody(method.requestType)
        }
      } catch (error) {
        if (sequence === parseSequence) {
          schemaError.value =
            error instanceof Error ? error.message : String(error)
        }
      } finally {
        if (sequence === parseSequence) isParsing.value = false
      }
    },
    { deep: true, immediate: true }
  )

  const services = computed(() => schema.value?.services ?? [])
  const methods = computed(
    () =>
      services.value.find(
        (item) => item.name === document.value.request.service
      )?.methods ?? []
  )
  const selectedMethod = computed(() =>
    schema.value
      ? findGRPCMethod(
          schema.value,
          document.value.request.service,
          document.value.request.method
        )
      : null
  )

  const send = async () => {
    if (isLoading.value) return

    const method = selectedMethod.value
    if (!method) {
      document.value.error = "Select a service and method first"
      return
    }
    if (!isUnaryGRPCMethod(method)) {
      document.value.error =
        "Streaming methods are not supported in this first version"
      return
    }
    const activeInterceptor = interceptor.current.value
    if (!supportsGRPC(activeInterceptor?.capabilities)) {
      document.value.error =
        "Native gRPC requires an interceptor with binary HTTP/2 support. Use the Desktop app's native interceptor."
      return
    }

    document.value.error = null
    document.value.response = null
    isLoading.value = true
    const invocation = ++invocationSequence
    try {
      const env = getCombinedEnvVariables()
      const variables = [...env.temp, ...env.selected, ...env.global]
      const request = document.value.request
      const body = encodeGRPCRequestBody(
        method.requestType,
        parseTemplateString(request.body, variables)
      )
      const execution = executeGRPCUnary({
        baseURL: parseTemplateString(request.url, variables),
        method,
        body,
        metadata: request.metadata.map((entry) => ({
          ...entry,
          key: parseTemplateString(entry.key, variables),
          value: parseTemplateString(entry.value, variables),
        })),
        execute: (relayRequest) => interceptor.execute(relayRequest),
      })
      cancelCurrent = execution.cancel
      const result = await execution.response
      if (invocation !== invocationSequence) return

      if (E.isRight(result)) document.value.response = result.right
      else if (result.left !== "cancellation") {
        document.value.error =
          result.left instanceof Error
            ? result.left.message
            : result.left.humanMessage.description((key) => key)
      }
    } catch (error) {
      if (invocation === invocationSequence) {
        document.value.error =
          error instanceof Error ? error.message : String(error)
      }
    } finally {
      if (invocation === invocationSequence) {
        cancelCurrent = null
        isLoading.value = false
      }
    }
  }

  const cancel = async () => {
    const cancelInvocation = cancelCurrent
    if (!cancelInvocation) return

    ++invocationSequence
    cancelCurrent = null
    isLoading.value = false

    await cancelInvocation()
  }

  return { services, methods, schemaError, isParsing, isLoading, send, cancel }
}
