import { computed, Ref, ref } from "vue"
import { useReadonlyStream } from "./stream"
import { platform } from "~/platform"
import { useSetting } from "./settings"
import { HoppGQLRequest, HoppRESTRequest } from "@hoppscotch/data"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import * as E from "fp-ts/Either"
import { useRoute } from "vue-router"

export const useRequestNameGeneration = (targetNameRef: Ref<string>) => {
  const toast = useToast()
  const t = useI18n()
  const route = useRoute()

  const targetPage = computed(() => {
    return route.fullPath.includes("/graphql") ? "gql" : "rest"
  })

  const isGenerateRequestNamePending = ref(false)

  const generateRequestNameForPlatform =
    platform.experiments?.aiExperiments?.generateRequestName

  const currentUser = useReadonlyStream(
    platform.auth.getCurrentUserStream(),
    platform.auth.getCurrentUser()
  )

  const ENABLE_AI_EXPERIMENTS = useSetting("ENABLE_AI_EXPERIMENTS")

  const canDoRequestNameGeneration = computed(() => {
    // Request generation applies only to the authenticated state
    if (!currentUser.value) {
      return false
    }

    return ENABLE_AI_EXPERIMENTS.value && !!platform.experiments?.aiExperiments
  })

  const generateRequestName = async (
    requestContext: HoppRESTRequest | HoppGQLRequest | null
  ) => {
    if (!requestContext || !generateRequestNameForPlatform) {
      toast.error(t("request.generate_name_error"))
      return
    }

    isGenerateRequestNamePending.value = true

    platform.analytics?.logEvent({
      type: "EXPERIMENTS_GENERATE_REQUEST_NAME_WITH_AI",
      platform: targetPage.value,
    })

    const result = await generateRequestNameForPlatform(
      JSON.stringify(requestContext)
    )

    if (result && E.isLeft(result)) {
      toast.error(t("request.generate_name_error"))

      isGenerateRequestNamePending.value = false

      return
    }

    targetNameRef.value = result.right.request_name

    isGenerateRequestNamePending.value = false
  }

  return {
    generateRequestName,
    isGenerateRequestNamePending,
    canDoRequestNameGeneration,
  }
}

export const useAIExperiments = () => {
  const currentUser = useReadonlyStream(
    platform.auth.getCurrentUserStream(),
    platform.auth.getCurrentUser()
  )

  const ENABLE_AI_EXPERIMENTS = useSetting("ENABLE_AI_EXPERIMENTS")

  const shouldEnableAIFeatures = computed(() => {
    // Request generation applies only to the authenticated state
    if (!currentUser.value) {
      return false
    }

    return ENABLE_AI_EXPERIMENTS.value && !!platform.experiments?.aiExperiments
  })

  return {
    shouldEnableAIFeatures,
  }
}

export const useModifyRequestBody = (
  currentRequestBody: string,
  userPromptRef: Ref<string>,
  generatedRequestBodyRef: Ref<string>
) => {
  const toast = useToast()
  const t = useI18n()

  const lastTraceID = ref<string | null>(null)

  const isModifyRequestBodyPending = ref(false)

  const modifyRequestBodyForPlatform =
    platform.experiments?.aiExperiments?.modifyRequestBody

  const modifyRequestBody = async () => {
    isModifyRequestBodyPending.value = true

    if (!modifyRequestBodyForPlatform) {
      toast.error(t("request.modify_request_body_error"))
      isModifyRequestBodyPending.value = false
      return
    }

    const result = await modifyRequestBodyForPlatform(
      currentRequestBody ?? "",
      userPromptRef.value
    )

    if (result && E.isLeft(result)) {
      toast.error(t("request.modify_request_body_error"))
      isModifyRequestBodyPending.value = false
      return
    }

    generatedRequestBodyRef.value = result.right.modified_body
    lastTraceID.value = result.right.trace_id

    isModifyRequestBodyPending.value = false
    return result.right
  }

  return {
    modifyRequestBody,
    isModifyRequestBodyPending,
    lastTraceID,
  }
}

export const useSubmitFeedback = () => {
  const submitFeedbackForPlatform =
    platform.experiments?.aiExperiments?.submitFeedback

  const isSubmitFeedbackPending = ref(false)

  const submitFeedback = async (
    rating: "positive" | "negative",
    traceID: string
  ) => {
    if (!submitFeedbackForPlatform) {
      return E.left("CANNOT_SUBMIT_FEEDBACK")
    }

    isSubmitFeedbackPending.value = true

    await submitFeedbackForPlatform(rating === "positive" ? 1 : -1, traceID)

    isSubmitFeedbackPending.value = false

    return E.right(undefined)
  }

  return {
    submitFeedback,
    isSubmitFeedbackPending,
  }
}
