interface TreeSturcture {
  id: string
  name: string
  description: string
  icon: string
  items: TreeSturcture[]
}

import { BehaviorSubject } from "rxjs"

export default class SmartTreeAdapter {
  treeData = new BehaviorSubject<TreeSturcture[]>([])

  constructor(private data: any | undefined) {
    if (data) this.initialize()
  }

  initialize() {
    this.treeData.next(this.data)
  }

  setTreeData(data: any) {
    this.treeData.next(data)
  }

  getChildNodes(nodeID: string, type: string) {
    const treeData = this.treeData.value
    if (type === "node") {
      const node = treeData.find((node) => node.id === nodeID)

      if (node) {
        console.log("getParentNodes", nodeID, node, this.treeData.value)

        return node.items
      }
    } else {
      const child = this.checkInChildren(this.treeData.value, nodeID)
      console.log("getChildNodes", child)
    }
  }

  checkInChildren(
    node: TreeSturcture[],
    id: string
  ): TreeSturcture[] | undefined {
    for (const child of node) {
      // Check in children of collections
      if (child.items) {
        const result = this.checkInChildren(child.items, id)
        if (result) return result
      }
    }
  }
}
