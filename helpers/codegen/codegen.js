import { JSXHRCodegen } from "./generators/js-xhr"
import { JSFetchCodegen } from "./generators/js-fetch"
import { CurlCodegen } from "./generators/curl"
import { JSAxiosCodegen } from "./generators/js-axios"
import { GoNativeCodegen } from "./generators/go-native"
import { NodeJsRequestCodegen } from "./generators/nodejs-request"
import { JSjQueryCodegen } from "./generators/js-jQuery"

/* Register code generators here.
 * A code generator is defined as an object with the following structure.
 *
 * id: string
 * name: string
 * generator: (ctx) => string
 *
 */
export const codegens = [
  JSXHRCodegen,
  JSFetchCodegen,
  CurlCodegen,
  JSAxiosCodegen,
  GoNativeCodegen,
  NodeJsRequestCodegen,
  JSjQueryCodegen,
]

export function generateCodeWithGenerator(codegenID, context) {
  if (codegenID) {
    const gen = codegens.find(({ id }) => id === codegenID)
    return gen ? gen.generator(context) : ""
  }

  return ""
}
