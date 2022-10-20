export type TreeNode<T> = {
  id: string
  data: T
}

export interface SmartTreeAdapter<T> {
  getChildren: (nodeID: string | null) => Array<TreeNode<T>>
}
