import { computed, defineComponent, ref } from "vue"

export function useSteps() {
  type Step = ReturnType<typeof defineStep>

  const steps: Step[] = []

  const currentStepIndex = ref(0)

  const currentStep = computed(() => {
    return steps[currentStepIndex.value]
  })

  const backHistoryIndexes = ref([0])

  const hasPreviousStep = computed(() => {
    return currentStepIndex.value > 0
  })

  const addStep = (step: Step) => {
    steps.push(step)
  }

  const goToNextStep = () => {
    currentStepIndex.value++
    backHistoryIndexes.value.push(currentStepIndex.value)
  }

  const goToStep = (stepId: string) => {
    currentStepIndex.value = steps.findIndex((step) => step.id === stepId)
    backHistoryIndexes.value.push(currentStepIndex.value)
  }

  const goToPreviousStep = () => {
    if (backHistoryIndexes.value.length !== 1) {
      backHistoryIndexes.value.pop()
      currentStepIndex.value =
        backHistoryIndexes.value[backHistoryIndexes.value.length - 1]
    }
  }

  return {
    steps,
    currentStep,
    addStep,
    goToPreviousStep,
    goToNextStep,
    goToStep,
    hasPreviousStep,
  }
}

export function defineStep<
  StepComponent extends ReturnType<typeof defineComponent>,
>(
  id: string,
  component: StepComponent,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  props: () => InstanceType<StepComponent>["$props"]
) {
  const step = {
    id,
    component,
    props,
  }

  return step
}
