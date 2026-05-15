import {
  defineComponent,
  nextTick,
  onBeforeUnmount,
  PropType,
  watch,
} from "vue"

type NodeToggleState = {
  toggleChildren: () => void
  isOpen: boolean
}

export type NodeScrollSelector = (targetId: string) => string[]

export interface CollectionNodeRevealOptions {
  openNodeRetries?: number
  scrollRetries?: number
  buildScrollSelectors: NodeScrollSelector
}

export function useCollectionNodeReveal(options: CollectionNodeRevealOptions) {
  const {
    openNodeRetries = 30,
    scrollRetries = 30,
    buildScrollSelectors,
  } = options

  const nodeTogglers = new Map<string, NodeToggleState>()

  const registerNodeToggler = (id: string, state: NodeToggleState) => {
    nodeTogglers.set(id, state)
  }

  const TreeNodeRegistrar = defineComponent({
    name: "TreeNodeRegistrar",
    props: {
      id: {
        type: String,
        required: true,
      },
      toggleChildren: {
        type: Function as PropType<() => void>,
        required: true,
      },
      isOpen: {
        type: Boolean,
        required: true,
      },
    },
    setup(props) {
      watch(
        () => [props.isOpen, props.toggleChildren] as const,
        ([isOpen]) => {
          registerNodeToggler(props.id, {
            toggleChildren: props.toggleChildren,
            isOpen,
          })
        },
        { immediate: true }
      )

      onBeforeUnmount(() => {
        nodeTogglers.delete(props.id)
      })

      return () => null
    },
  })

  const openNode = async (id: string) => {
    let toggleIssued = false

    for (let attempt = 0; attempt < openNodeRetries; attempt++) {
      const entry = nodeTogglers.get(id)
      if (entry) {
        if (entry.isOpen) return
        if (!toggleIssued) {
          entry.toggleChildren()
          toggleIssued = true
        }
      }

      await nextTick()
    }
  }

  const scrollToNode = async (targetId: string) => {
    const selectors = buildScrollSelectors(targetId)

    for (let attempt = 0; attempt < scrollRetries; attempt++) {
      const el = selectors
        .map((selector) => document.querySelector(selector))
        .find((node) => node !== null)

      if (el && "scrollIntoView" in el) {
        ;(el as HTMLElement).scrollIntoView({
          block: "center",
          behavior: "smooth",
        })
        return
      }
      await nextTick()
    }
  }

  const expandAncestors = async (folderPath: string) => {
    const parts = folderPath.split("/").filter((p) => p.length > 0)
    for (let i = 0; i < parts.length; i++) {
      await openNode(parts.slice(0, i + 1).join("/"))
    }
    await nextTick()
  }

  return {
    nodeTogglers,
    registerNodeToggler,
    TreeNodeRegistrar,
    openNode,
    scrollToNode,
    expandAncestors,
  }
}
