import {
  JSONArrayValue,
  JSONObjectMember,
  JSONObjectValue,
  JSONValue,
} from "./jsonParse"

type RootEntry =
  | {
      kind: "RootObject"
      astValue: JSONObjectValue
    }
  | {
      kind: "RootArray"
      astValue: JSONArrayValue
    }

type ObjectMemberEntry = {
  kind: "ObjectMember"
  name: string
  astValue: JSONObjectMember
  astParent: JSONObjectValue
}

type ArrayMemberEntry = {
  kind: "ArrayMember"
  index: number
  astValue: JSONValue
  astParent: JSONArrayValue
}

type PathEntry = RootEntry | ObjectMemberEntry | ArrayMemberEntry

export function getJSONOutlineAtPos(
  jsonRootAst: JSONObjectValue | JSONArrayValue,
  posIndex: number
): PathEntry[] | null {
  try {
    const rootObj = jsonRootAst

    if (posIndex > rootObj.end || posIndex < rootObj.start)
      throw new Error("Invalid position")

    let current: JSONValue = rootObj

    const path: PathEntry[] = []

    if (rootObj.kind === "Object") {
      path.push({
        kind: "RootObject",
        astValue: rootObj,
      })
    } else {
      path.push({
        kind: "RootArray",
        astValue: rootObj,
      })
    }

    while (current.kind === "Object" || current.kind === "Array") {
      if (current.kind === "Object") {
        const next: JSONObjectMember | undefined = current.members.find(
          (member) => member.start <= posIndex && member.end >= posIndex
        )

        if (!next) throw new Error("Couldn't find child")

        path.push({
          kind: "ObjectMember",
          name: next.key.value,
          astValue: next,
          astParent: current,
        })

        current = next.value
      } else {
        const nextIndex = current.values.findIndex(
          (value) => value.start <= posIndex && value.end >= posIndex
        )

        if (nextIndex < 0) throw new Error("Couldn't find child")

        const next: JSONValue = current.values[nextIndex]

        path.push({
          kind: "ArrayMember",
          index: nextIndex,
          astValue: next,
          astParent: current,
        })

        current = next
      }
    }

    return path
  } catch (e: any) {
    return null
  }
}
