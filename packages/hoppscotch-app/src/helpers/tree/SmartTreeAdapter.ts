import { Ref } from "vue"

export type TreeNode<T> = {
  id: string
  data: T
}

export type ChildrenResult<T> =
  | {
      status: "loading"
    }
  | {
      status: "loaded"
      data: Array<TreeNode<T>>
    }

export interface SmartTreeAdapter<T> {
  getChildren: (nodeID: string | null) => Ref<ChildrenResult<T>>
}
