import tern from "tern"

import ECMA_DEF from "~/helpers/terndoc/ecma.json"
import PW_PRE_DEF from "~/helpers/terndoc/pw-pre.json"
import PW_TEST_DEF from "~/helpers/terndoc/pw-test.json"

const server = new tern.Server({
  defs: [ECMA_DEF]
})

function performCompletion(code, row, col) {
  return new Promise((resolve, reject) => {
    server.request({
      query: {
        type: "completions",
        file: "doc",
        end: {
          line: row,
          ch: col
        },
        guess: false,
        sort: true,
        types: true,
        includeKeywords: true,
        inLiteral: false
      },
      files: [
        {
          type: "full",
          name: "doc",
          text: code
        }
      ]
    }, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
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
