import { Ref } from "vue"

export type TreeNode<T> = {
  type: string
  id: string
  data: T
}

export interface SmartTreeAdapter<T> {
  getChildren: (nodeID: string | null) => Ref<Array<TreeNode<T>>>
}
