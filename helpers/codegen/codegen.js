import { JSXHRCodegen } from "./generators/js-xhr"
import { JSFetchCodegen } from "./generators/js-fetch"
import { CurlCodegen } from "./generators/curl"
import { JSAxiosCodegen } from "./generators/js-axios"

/* Register code generators here.
 * A code generator is defined as an object with the following structure.
 *
 * id: string
 * name: string
 * generator: (ctx) => string
 *
 */
export const codegens = [JSXHRCodegen, JSFetchCodegen, CurlCodegen, JSAxiosCodegen]

export function generateCodeWithGenerator(codegenID, context) {
  if (codegenID) {
    const gen = codegens.find(({ id }) => id === codegenID)
    return gen ? gen.generator(context) : ""
  }

  return ""
}
