import tern from "tern"

import ECMA_DEF from "~/helpers/terndoc/ecma.json"
import PW_PRE_DEF from "~/helpers/terndoc/pw-pre.json"
import PW_TEST_DEF from "~/helpers/terndoc/pw-test.json"
import PW_EXTRAS_DEF from "~/helpers/terndoc/pw-extras.json"

const server = new tern.Server({
  defs: [ECMA_DEF, PW_EXTRAS_DEF],
})

function postProcessCompletionResult(res) {
  if (res.completions) {
    const index = res.completions.findIndex((el) => el.name === "pw")

    if (index !== -1) {
      const result = res.completions[index]

      res.completions.splice(index, 1)
      res.completions.splice(0, 0, result)
    }
  }

  console.log(res)

  return res
}

function performCompletion(code, row, col) {
  return new Promise((resolve, reject) => {
    server.request(
      {
        query: {
          type: "completions",
          file: "doc",
          end: {
            line: row,
            ch: col,
          },
          guess: false,
          types: true,
          includeKeywords: true,
          inLiteral: false,
        },
        files: [
          {
            type: "full",
            name: "doc",
            text: code,
          },
        ],
      },
      (err, res) => {
        if (err) reject(err)
        else resolve(postProcessCompletionResult(res))
      }
    )
  })
}

export function getPreRequestScriptCompletions(code, row, col) {
  server.deleteDefs("pw-test")
  server.deleteDefs("pw-pre")
  server.addDefs(PW_PRE_DEF)
  return performCompletion(code, row, col)
}

export function getTestScriptCompletions(code, row, col) {
  server.deleteDefs("pw-test")
  server.deleteDefs("pw-pre")
  server.addDefs(PW_TEST_DEF)
  return performCompletion(code, row, col)
}
