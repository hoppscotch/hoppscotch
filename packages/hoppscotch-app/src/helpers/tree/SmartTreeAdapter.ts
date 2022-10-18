export interface SmartTreeAdapter<T> {
  getChildren: (nodeID: string | null) => Array<T>
}
