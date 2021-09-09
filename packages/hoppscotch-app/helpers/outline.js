import jsonParse from "./jsonParse"

export default () => {
  let jsonAST = {}
  let path = []

  const init = (jsonStr) => {
    jsonAST = jsonParse(jsonStr)
    linkParents(jsonAST)
  }

  const setNewText = (jsonStr) => {
    init(jsonStr)
    path = []
  }

  const linkParents = (node) => {
    if (node.kind === "Object") {
      if (node.members) {
        node.members.forEach((m) => {
          m.parent = node
          linkParents(m)
        })
      }
    } else if (node.kind === "Array") {
      if (node.values) {
        node.values.forEach((v) => {
          v.parent = node
          linkParents(v)
        })
      }
    } else if (node.kind === "Member") {
      if (node.value) {
        node.value.parent = node
        linkParents(node.value)
      }
    }
  }

  const genPath = (index) => {
    let output = {}
    path = []
    let current = jsonAST
    if (current.kind === "Object") {
      path.push({ label: "{}", obj: "root" })
    } else if (current.kind === "Array") {
      path.push({ label: "[]", obj: "root" })
    }
    let over = false

    try {
      while (!over) {
        if (current.kind === "Object") {
          let i = 0
          let found = false
          while (i < current.members.length) {
            const m = current.members[i]
            if (m.start <= index && m.end >= index) {
              path.push({ label: m.key.value, obj: m })
              current = current.members[i]
              found = true
              break
            }
            i++
          }
          if (!found) over = true
        } else if (current.kind === "Array") {
          if (current.values) {
            let i = 0
            let found = false
            while (i < current.values.length) {
              const m = current.values[i]
              if (m.start <= index && m.end >= index) {
                path.push({ label: `[${i.toString()}]`, obj: m })
                current = current.values[i]
                found = true
                break
              }
              i++
            }
            if (!found) over = true
          } else over = true
        } else if (current.kind === "Member") {
          if (current.value) {
            if (current.value.start <= index && current.value.end >= index) {
              current = current.value
            } else over = true
          } else over = true
        } else if (
          current.kind === "String" ||
          current.kind === "Number" ||
          current.kind === "Boolean" ||
          current.kind === "Null"
        ) {
          if (current.start <= index && current.end >= index) {
            path.push({ label: `${current.value}`, obj: current })
          }
          over = true
        }
      }
      output = { success: true, res: path.map((p) => p.label) }
    } catch (e) {
      output = { success: false, res: e }
    }
    return output
  }

  const getSiblings = (index) => {
    const parent = path[index]?.obj?.parent
    if (!parent) return []
    else if (parent.kind === "Object") {
      return parent.members
    } else if (parent.kind === "Array") {
      return parent.values
    } else return []
  }

  return {
    init,
    genPath,
    getSiblings,
    setNewText,
  }
}
