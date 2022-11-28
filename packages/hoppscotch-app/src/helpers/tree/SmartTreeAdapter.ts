import { Ref } from "vue"

/**
 * Representation of a tree node in the SmartTreeAdapter.
 */
export type TreeNode<T> = {
  id: string
  data: T
}

/**
 * Representation of children result from a tree node when there will be a loading state.
 */
export type ChildrenResult<T> =
  | {
      status: "loading"
    }
  | {
      status: "loaded"
      data: Array<TreeNode<T>>
    }

/**
 * A tree adapter that can be used with the SmartTree component.
 * @template T The type of data that is stored in the tree.
 */
export interface SmartTreeAdapter<T> {
  /**
   *
   * @param nodeID - id of the node to get children for
   * @returns - Ref that contains the children of the node. It is reactive and will be updated when the children are changed.
   */
  getChildren: (nodeID: string | null) => Ref<ChildrenResult<T>>
}
