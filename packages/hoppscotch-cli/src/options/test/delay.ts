import { error } from "../../types/errors";

export function parseDelayOption(delay: string): number {
  const maybeInt = Number.parseInt(delay)

  if(!Number.isNaN(maybeInt)) {
    return maybeInt
  } else {
    throw error({
      code: "INVALID_ARGUMENT",
      data: "Expected '-d, --delay' value to be number",
    })
  }
}
