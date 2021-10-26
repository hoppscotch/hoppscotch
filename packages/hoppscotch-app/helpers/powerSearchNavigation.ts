import { ref } from "@nuxtjs/composition-api"

const NAVIGATION_KEYS = ["ArrowDown", "ArrowUp", "Enter"]

export function useArrowKeysNavigation(searchItems: any, options: any = {}) {
  function handleArrowKeysNavigation(
    event: any,
    itemIndex: any,
    preventPropagation: Boolean
  ) {
    if (!NAVIGATION_KEYS.includes(event.key)) return

    if (preventPropagation) event.stopImmediatePropagation()

    const itemsLength = searchItems.value.length
    const lastItemIndex = itemsLength - 1
    const itemIndexValue = itemIndex.value
    const action = searchItems.value[itemIndexValue].action

    if (action && event.key === "Enter" && options.onEnter) {
      options.onEnter(action)
      return
    }

    if (event.key === "ArrowDown") {
      itemIndex.value = itemIndexValue < lastItemIndex ? itemIndexValue + 1 : 0
    } else if (itemIndexValue === 0) itemIndex.value = lastItemIndex
    else if (event.key === "ArrowUp") itemIndex.value = itemIndexValue - 1
  }

  const preventPropagation = options && options.stopPropagation

  const selectedEntry = ref(0)

  const onKeyUp = (event: any) => {
    handleArrowKeysNavigation(event, selectedEntry, preventPropagation)
  }

  function bindArrowKeysListerners() {
    window.addEventListener("keydown", onKeyUp, { capture: preventPropagation })
  }

  function unbindArrowKeysListerners() {
    window.removeEventListener("keydown", onKeyUp, {
      capture: preventPropagation,
    })
  }

  return {
    bindArrowKeysListerners,
    unbindArrowKeysListerners,
    selectedEntry,
  }
}
